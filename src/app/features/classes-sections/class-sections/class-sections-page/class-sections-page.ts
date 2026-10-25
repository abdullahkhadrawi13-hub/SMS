import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { SchoolClassesService } from '../../../../core/services/school-classes';
import { SectionsService } from '../../../../core/services/sections';
import { AcademicTermsService } from '../../../../core/services/academic-terms';
import { AcademicYearsService } from '../../../../core/services/academic-years';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { Permissions } from '../../../../core/services/permissions';
import { ActionResult } from '../../../../shared/services/action-result';

import {
  ClassesSectionsTerm,
  SectionStatusFilter,
  getClassColor,
  sortClassesByLevel,
  toClassesSectionsTerms
} from '../../shared/classes-sections-shared';

import {
  ClassesForm,
  ClassFormData,
  ClassFormResult
} from '../../classes/classes-form/classes-form';

import { ClassBanner } from '../class-banner/class-banner';
import { SectionsToolbar } from '../sections-toolbar/sections-toolbar';
import { SectionsList } from '../sections-list/sections-list';
import {
  SectionsForm,
  SectionFormData,
  SectionFormResult
} from '../sections-form/sections-form';

// The page of one class: /classes-sections/:classId
// (opened from a class card). It shows the class (banner),
// then its sections with their student count in the chosen term.
//
// The parent owns and loads all the data;
// the children only display it and send the actions up.
@Component({
  selector: 'app-class-sections-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    ClassBanner,
    SectionsToolbar,
    SectionsList,
  ],
  templateUrl: './class-sections-page.html',
  styleUrl: './class-sections-page.css',
})
export class ClassSectionsPage {

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);
  private readonly termsService = inject(AcademicTermsService);
  private readonly yearsService = inject(AcademicYearsService);

  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly permissions = inject(Permissions);

  // Only the Admin edits the class and adds, edits, activates
  // or deactivates sections. The Assistant Principal can only read.
  readonly canManageClass = this.permissions.canManageClasses;
  readonly canManageSections = this.permissions.canManageSections;


  // ===== The class =====

  // The class id from the URL. 0 = not a valid id.
  readonly classId = signal(0);

  // Every class, sorted by level: the class's position in this list
  // gives it the same color as its card on the classes page.
  private readonly classes = signal<SchoolClass[]>([]);

  // This page's class (null while loading, or not found).
  readonly schoolClass = computed(
    () => this.classes().find(c => c.schoolClassId === this.classId()) ?? null
  );

  // The class colors (grey for an inactive class).
  readonly color = computed(() => {
    const schoolClass = this.schoolClass();

    return schoolClass
      ? getClassColor(schoolClass, this.classes().indexOf(schoolClass))
      : null;
  });

  // First load of the class and the terms (the whole page waits for it).
  readonly isLoadingPage = signal(false);

  // Error of the first load (translation key or API message): replaces the page.
  readonly pageError = signal('');

  // True while the class status is being changed (prevents repeated clicks).
  readonly isTogglingClass = signal(false);


  // ===== Terms =====

  // Every term with its year name, newest first.
  readonly terms = signal<ClassesSectionsTerm[]>([]);

  // The term whose student counts are shown (the current term at first).
  readonly selectedTermId = signal<number | null>(null);


  // ===== Sections =====

  // The class's sections in the chosen term (active and inactive).
  readonly sections = signal<Section[]>([]);

  readonly isLoadingSections = signal(false);

  // Error of the sections list (translation key or API message).
  readonly sectionsError = signal('');

  // The "Status" filter (done here, no new request).
  readonly statusFilter = signal<SectionStatusFilter>('all');

  // id of the section whose status is being changed right now.
  readonly togglingSectionId = signal<number | null>(null);

  // The sections shown in the list, after the status filter.
  readonly visibleSections = computed(() => {
    const filter = this.statusFilter();

    return this.sections().filter(section =>
      filter === 'all' || (filter === 'active') === section.isActive
    );
  });

  // The largest student count of the class's sections: each row's bar
  // is drawn relative to it (at least 1, so an empty class has no division by 0).
  readonly maxStudentCount = computed(
    () => Math.max(1, ...this.sections().map(s => s.studentCount))
  );

  // Sections can be added only to an active class, by the Admin.
  readonly canAddSection = computed(
    () => this.canManageSections() && (this.schoolClass()?.isActive ?? false)
  );


  constructor() {

    // /classes-sections/:classId — also when the id changes while the page is open.
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('classId'));

        this.classId.set(Number.isInteger(id) && id > 0 ? id : 0);
        this.statusFilter.set('all');

        this.loadPage();
      });
  }


  // ===== Loading =====

  // Loads the classes and the terms together, then the sections
  // (GET /api/schoolclasses + /api/academicterms + /api/academicyears).
  loadPage(): void {

    if (!this.classId()) {
      this.pageError.set('CLASS_SECTIONS.ERROR.NOT_FOUND');
      return;
    }

    this.isLoadingPage.set(true);
    this.pageError.set('');

    forkJoin({
      classes: this.classesService.getSchoolClasses(1, 100),
      terms: this.termsService.getAcademicTerms(),
      years: this.yearsService.getAcademicYears()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ classes, terms, years }) => {
          this.isLoadingPage.set(false);

          if (!classes.success) {
            this.pageError.set(this.apiMessageService.getMessage(classes));
            return;
          }

          this.classes.set(sortClassesByLevel(classes.data.items));

          if (!this.schoolClass()) {
            this.pageError.set('CLASS_SECTIONS.ERROR.NOT_FOUND');
            return;
          }

          const options = toClassesSectionsTerms(
            terms.success ? terms.data : [],
            years.success ? years.data : []
          );

          this.terms.set(options);

          // Keep the chosen term when the page reloads; otherwise the current one.
          const selected =
            options.find(t => t.academicTermId === this.selectedTermId())
            ?? options.find(t => t.isCurrent)
            ?? options[0]
            ?? null;

          this.selectedTermId.set(selected?.academicTermId ?? null);

          this.loadSections();
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the class page:', error);

          this.isLoadingPage.set(false);
          this.pageError.set('CLASS_SECTIONS.ERROR.LOAD_FAILED');
        }
      });
  }

  // Loads the class's sections in the chosen term
  // (GET /api/sections?classId=..&academicTermId=..).
  loadSections(): void {
    const termId = this.selectedTermId();

    this.isLoadingSections.set(true);
    this.sectionsError.set('');

    this.sectionsService
      .getAllSections({
        classId: this.classId(),
        ...(termId ? { academicTermId: termId } : {})
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoadingSections.set(false);

          if (!response.success) {
            this.sections.set([]);
            this.sectionsError.set(this.apiMessageService.getMessage(response));
            return;
          }

          this.sections.set(
            [...response.data].sort((a, b) =>
              a.sectionAr.localeCompare(b.sectionAr, 'ar')
            )
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load sections:', error);

          this.isLoadingSections.set(false);
          this.sections.set([]);
          this.sectionsError.set('CLASS_SECTIONS.ERROR.SECTIONS_FAILED');
        }
      });
  }


  // ===== Toolbar =====

  onTermChange(termId: number): void {
    this.selectedTermId.set(termId);
    this.loadSections();
  }

  onStatusChange(filter: SectionStatusFilter): void {
    this.statusFilter.set(filter);
  }


  // ===== Class actions (Admin) =====

  // Opens the class form (the same form as on the classes page).
  openEditClass(): void {
    const schoolClass = this.schoolClass();

    if (!schoolClass) {
      return;
    }

    this.dialog
      .open<ClassesForm, ClassFormData, ClassFormResult>(ClassesForm, {
        width: '500px',
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data: { schoolClass }
      })
      .afterClosed()
      .subscribe(result => {
        if (result?.success) {
          this.loadPage();
        }
      });
  }

  // Activates or deactivates the class (PATCH /api/schoolclasses/{id}/status).
  toggleClassStatus(): void {
    const schoolClass = this.schoolClass();

    if (!schoolClass || this.isTogglingClass()) {
      return;
    }

    this.isTogglingClass.set(true);

    this.classesService
      .updateSchoolClassStatus(schoolClass.schoolClassId, !schoolClass.isActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isTogglingClass.set(false);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          this.loadPage();
          this.actionResult.show('success', this.apiMessageService.getMessage(response));
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to update class status:', error);

          this.isTogglingClass.set(false);
          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        }
      });
  }


  // ===== Section actions (Admin) =====

  openAddSection(): void {
    this.openSectionForm(null);
  }

  openEditSection(section: Section): void {
    this.openSectionForm(section);
  }

  // Activates or deactivates a section (PATCH /api/sections/{id}/status).
  toggleSectionStatus(section: Section): void {

    if (this.togglingSectionId() !== null) {
      return;
    }

    this.togglingSectionId.set(section.sectionId);

    this.sectionsService
      .updateSectionStatus(section.sectionId, !section.isActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.togglingSectionId.set(null);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          this.loadSections();
          this.actionResult.show('success', this.apiMessageService.getMessage(response));
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to update section status:', error);

          this.togglingSectionId.set(null);
          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        }
      });
  }

  // The form sends the request itself and closes only after a successful save.
  private openSectionForm(section: Section | null): void {
    const schoolClass = this.schoolClass();

    if (!schoolClass) {
      return;
    }

    this.dialog
      .open<SectionsForm, SectionFormData, SectionFormResult>(SectionsForm, {
        width: '460px',
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data: { schoolClass, section }
      })
      .afterClosed()
      .subscribe(result => {
        if (result?.success) {
          this.loadSections();
        }
      });
  }
}
