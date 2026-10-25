import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, switchMap } from 'rxjs';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

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
  sortClassesByLevel,
  toClassesSectionsTerms
} from '../../shared/classes-sections-shared';

import { ClassesHeader } from '../classes-header/classes-header';
import { ClassesGrid } from '../classes-grid/classes-grid';
import {
  ClassesForm,
  ClassFormData,
  ClassFormResult
} from '../classes-form/classes-form';

// The first page of "Classes & Sections" (/classes-sections):
// one card per class. A card shows the class's sections and student count
// in the current term, and opens the class page (/classes-sections/:classId).
@Component({
  selector: 'app-classes-page',
  imports: [
    ClassesHeader,
    ClassesGrid,
    MatDialogModule,
  ],
  templateUrl: './classes-page.html',
  styleUrl: './classes-page.css',
})
export class ClassesPage {

  // Service used to communicate with the SchoolClasses API.
  private readonly classesService = inject(SchoolClassesService);

  // Sections of every class (GET /api/sections), for the cards.
  private readonly sectionsService = inject(SectionsService);

  // The current term (its student counts) and its year name.
  private readonly termsService = inject(AcademicTermsService);
  private readonly yearsService = inject(AcademicYearsService);

  // Used to stop pending requests when the page is destroyed.
  private readonly destroyRef = inject(DestroyRef);

  // Opens the add / edit class dialog.
  private readonly dialog = inject(MatDialog);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  // Shows the success / error result dialog after an action.
  private readonly actionResult = inject(ActionResult);

  // Current UI direction, passed to the dialog (RTL for Arabic, LTR for English).
  private readonly language = inject(Language);

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);

  // Only the Admin can add, edit, activate or deactivate classes.
  // The Assistant Principal can only read.
  readonly canManage = this.permissions.canManageClasses;

  // All the school's classes, sorted by level.
  readonly classes = signal<SchoolClass[]>([]);

  // Indicates whether the list is currently loading.
  readonly isLoading = signal(false);

  // Error message (API message or translation key) shown instead of the cards.
  readonly errorMessage = signal('');

  // id of the class whose status is being changed right now
  // (prevents repeated clicks).
  readonly togglingClassId = signal<number | null>(null);

  // ===== Sections (for the cards) =====

  // The current term: its student counts are shown on the cards.
  // null = no current term is set (the counts then come from the API's default).
  readonly currentTerm = signal<ClassesSectionsTerm | null>(null);

  // Every section of the school in the current term.
  readonly sections = signal<Section[]>([]);

  // false while the sections load, or when they failed: the cards are
  // still shown, only without their sections and counts.
  readonly sectionsLoaded = signal(false);

  // The sections of each class: classId -> sections, sorted by name.
  readonly sectionsByClass = computed(() => {
    const byClass = new Map<number, Section[]>();

    for (const section of this.sections()) {
      const list = byClass.get(section.classId) ?? [];
      list.push(section);
      byClass.set(section.classId, list);
    }

    for (const list of byClass.values()) {
      list.sort((a, b) => a.sectionAr.localeCompare(b.sectionAr, 'ar'));
    }

    return byClass;
  });

  constructor() {
    // Load the classes and their sections when the page is opened.
    this.loadClasses();
    this.loadSections();
  }

  // A school has only a few classes, so they are loaded in one request
  // and shown without pagination.
  // The list endpoint is paged, so we ask for one large page.
  private static readonly ALL_CLASSES_PAGE_SIZE = 100;

  // Loads all classes (GET /api/schoolclasses?pageNumber=1&pageSize=100).
  // The API has no search or status filter for classes.
  loadClasses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.classesService
      .getSchoolClasses(1, ClassesPage.ALL_CLASSES_PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.classes.set([]);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );
            this.isLoading.set(false);
            return;
          }

          // Show the classes in school order (by level).
          this.classes.set(sortClassesByLevel(response.data.items));
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load classes:', error);

          this.classes.set([]);
          this.errorMessage.set('CLASSES.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        }
      });
  }

  // Finds the current term, then loads every section in it
  // (GET /api/academicterms + /api/academicyears, then GET /api/sections).
  // A failure here does not hide the classes: the cards just show no sections.
  loadSections(): void {
    this.sectionsLoaded.set(false);

    forkJoin({
      terms: this.termsService.getAcademicTerms(),
      years: this.yearsService.getAcademicYears()
    })
      .pipe(
        switchMap(({ terms, years }) => {
          const options = toClassesSectionsTerms(
            terms.success ? terms.data : [],
            years.success ? years.data : []
          );

          const current = options.find(term => term.isCurrent) ?? null;
          this.currentTerm.set(current);

          return this.sectionsService.getAllSections(
            current ? { academicTermId: current.academicTermId } : {}
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.sections.set(response.success ? response.data : []);
          this.sectionsLoaded.set(response.success);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load sections:', error);

          this.sections.set([]);
          this.sectionsLoaded.set(false);
        }
      });
  }

  // Reloads the list after a failed request.
  retry(): void {
    this.loadClasses();
    this.loadSections();
  }

  // Opens the class form in add mode (POST /api/schoolclasses).
  openAddClass(): void {
    this.openClassForm({});
  }

  // Opens the class form in edit mode (PUT /api/schoolclasses/{id}).
  openEditClass(schoolClass: SchoolClass): void {
    this.openClassForm({ schoolClass });
  }

  // Activates or deactivates a class (PATCH /api/schoolclasses/{id}/status).
  toggleClassStatus(schoolClass: SchoolClass): void {

    if (this.togglingClassId() !== null) {
      return;
    }

    this.togglingClassId.set(schoolClass.schoolClassId);

    this.classesService
      .updateSchoolClassStatus(
        schoolClass.schoolClassId,
        !schoolClass.isActive
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.togglingClassId.set(null);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          // Reload instead of relying on response.data,
          // because the API does not document what this endpoint returns.
          this.loadClasses();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to update class status:', error);

          this.togglingClassId.set(null);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }

  // The form sends the request itself and closes only after a successful save.
  private openClassForm(data: ClassFormData): void {
    this.dialog
      .open<ClassesForm, ClassFormData, ClassFormResult>(ClassesForm, {
        width: '500px',
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.success) {
          this.loadClasses();
        }
      });
  }

}
