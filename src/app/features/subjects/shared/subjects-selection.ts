import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { forkJoin } from 'rxjs';

import { AcademicTermsService } from '../../../core/services/academic-terms';
import { AcademicYearsService } from '../../../core/services/academic-years';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { SchoolClassesService } from '../../../core/services/school-classes';
import { SchoolClassSimpleDto } from '../../../core/models/school-class';

import { getTermLabel, TermOption } from './subjects-shared';


// The term and class chosen in the Subjects page, shared by the
// "Subject plans" and "Subject assignments" tabs.
// When the admin picks "First term · First grade" in one tab and opens the
// other, the same term and class are already selected there.
//
// It also loads the two dropdown lists once for both tabs:
//   - every academic term (GET /api/academicterms + GET /api/academicyears for the year name)
//   - the active classes (GET /api/schoolclasses/active)
//
// Not providedIn 'root': the Subjects page provides it, so it lives
// only while the page is open and starts fresh the next time.
// The section stays in the assignments tab (the plans tab has no section).
@Injectable()
export class SubjectsSelection {

  private readonly termsService = inject(AcademicTermsService);
  private readonly yearsService = inject(AcademicYearsService);
  private readonly classesService = inject(SchoolClassesService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // ===== Lists =====

  // Every term, newest first.
  readonly terms = signal<TermOption[]>([]);

  // Active classes only.
  readonly classes = signal<SchoolClassSimpleDto[]>([]);

  readonly isLoading = signal(false);

  // The message shown when the terms could not be loaded.
  readonly errorMessage = signal('');

  // true once the lists are loaded (the page starts writing the URL then).
  readonly isReady = signal(false);


  // ===== Selection =====

  readonly termId = signal<number | null>(null);
  readonly classId = signal<number | null>(null);


  readonly selectedTerm = computed(
    () => this.terms().find(t => t.academicTermId === this.termId()) ?? null
  );

  // "First Term · 2026/2027"
  readonly selectedTermLabel = computed(() => {

    const term = this.selectedTerm();

    return term ? getTermLabel(term, this.isArabic()) : '';
  });

  readonly selectedClassName = computed(() => {

    const schoolClass = this.classes().find(
      c => c.schoolClassId === this.classId()
    );

    if (!schoolClass) {
      return '';
    }

    return this.isArabic()
      ? schoolClass.classNameAr
      : schoolClass.classNameEn;
  });


  // Loads both lists, then selects:
  //   - the term from the URL when it exists, otherwise the current term
  //     (otherwise the newest one)
  //   - the class from the URL when it is an active class, otherwise none
  load(initialTermId: number | null, initialClassId: number | null): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      terms: this.termsService.getAcademicTerms(),
      years: this.yearsService.getAcademicYears(),
      classes: this.classesService.getActiveSchoolClasses(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ terms, years, classes }) => {

          const yearNames = new Map(
            (years.success ? years.data : [])
              .map(y => [y.academicYearId, y.yearName])
          );

          // Newest term first.
          const options: TermOption[] = (terms.success ? terms.data : [])
            .map(t => ({
              academicTermId: t.academicTermId,
              nameAr: t.nameAr,
              nameEn: t.nameEn,
              yearName: yearNames.get(t.academicYearId) ?? '',
              startDate: t.startDate,
              isCurrent: t.isCurrent,
            }))
            .sort((a, b) => b.startDate.localeCompare(a.startDate));

          const activeClasses = classes.success ? classes.data : [];

          this.terms.set(options);
          this.classes.set(activeClasses);

          const term =
            options.find(t => t.academicTermId === initialTermId)
            ?? options.find(t => t.isCurrent)
            ?? options[0];

          const schoolClass = activeClasses.find(
            c => c.schoolClassId === initialClassId
          );

          this.termId.set(term?.academicTermId ?? null);
          this.classId.set(schoolClass?.schoolClassId ?? null);

          this.isLoading.set(false);
          this.isReady.set(true);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load terms and classes:', error);

          this.terms.set([]);
          this.classes.set([]);
          this.isLoading.set(false);
          this.isReady.set(true);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  selectTerm(termId: number): void {
    this.termId.set(termId);
  }

  selectClass(classId: number): void {
    this.classId.set(classId);
  }
}
