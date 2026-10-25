import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { forkJoin, Subscription } from 'rxjs';

import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { SubjectPlansService } from '../../../../core/services/subject-plans';
import { SubjectsService } from '../../../../core/services/subjects';
import { ActionResult } from '../../../../shared/services/action-result';
import { SubjectDto } from '../../../../core/models/subject';
import {
  CopySubjectPlansResult,
  SubjectPlan,
} from '../../../../core/models/subject-plan';

import { SubjectsSelection } from '../../shared/subjects-selection';
import { TermClassSelector } from '../../shared/term-class-selector/term-class-selector';
import { PlanCard } from '../plan-card/plan-card';
import { PlanForm, PlanFormData } from '../plan-form/plan-form';
import { CopyPlansData, CopyPlansDialog } from '../copy-plans-dialog/copy-plans-dialog';


// The "Subject plans" tab (SMS API Reference, section 9).
// The admin picks a term and a class (shared with the assignments tab)
// and sees one card per subject plan of that class, plus one card per
// active subject that has no plan yet.
//
// Loads (each time the tab is opened, or the term / class changes):
//   - GET /api/subjectplans?academicTermId=&classId=
//   - GET /api/subjects (the subjects without a plan are the active ones left)
//
// "New plan" and "Copy from an earlier term" are buttons of the page header:
// the page calls openCreatePlan() and openCopy() on this tab.
@Component({
  selector: 'app-subject-plans-tab',
  imports: [
    TermClassSelector,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    PlanCard,
    TranslatePipe,
  ],
  templateUrl: './subject-plans-tab.html',
  styleUrl: './subject-plans-tab.css',
})
export class SubjectPlansTab {

  private readonly plansService = inject(SubjectPlansService);
  private readonly subjectsService = inject(SubjectsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  // The term and class shared with the assignments tab.
  readonly selection = inject(SubjectsSelection);


  // Shows the create / copy / assign actions (Admin only).
  readonly canManage = input(false);

  // true while this tab is the open tab. The data is loaded only then.
  readonly active = input(false);

  // "Assign a teacher" on a card: the page opens the assignments tab.
  readonly assignTeacher = output<void>();


  readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // =========================
  // Data
  // =========================

  readonly plans = signal<SubjectPlan[]>([]);
  readonly subjects = signal<SubjectDto[]>([]);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // true while the lists are loading before the "New plan" dialog opens.
  readonly openingForm = signal(false);


  // true when a term and a class are chosen.
  readonly hasSelection = computed(
    () => this.selection.termId() !== null && this.selection.classId() !== null
  );

  // The active subjects that have no plan for the class yet, sorted by name.
  readonly subjectsWithoutPlan = computed(() => {

    const planned = new Set(this.plans().map(p => p.subjectId));
    const isArabic = this.isArabic();

    return this.subjects()
      .filter(s => s.isActive && !planned.has(s.subjectId))
      .sort((a, b) =>
        (isArabic ? a.subjectAr : a.subjectEn)
          .localeCompare(isArabic ? b.subjectAr : b.subjectEn)
      );
  });

  // The counters above the cards.
  readonly counts = computed(() => {

    const plans = this.plans();
    const ready = plans.filter(p => p.isComplete).length;

    return {
      total: plans.length + this.subjectsWithoutPlan().length,
      ready,
      incomplete: plans.length - ready,
      withoutPlan: this.subjectsWithoutPlan().length,
    };
  });

  // First load: nothing to show yet, the big spinner replaces the cards.
  readonly isInitialLoading = computed(
    () => this.isLoading() && this.plans().length === 0 && this.subjects().length === 0
  );

  // Reload: the old cards stay with a thin bar on top.
  readonly isRefreshing = computed(
    () => this.isLoading() && !this.isInitialLoading()
  );


  private dataRequest?: Subscription;

  // The term + class loaded now (null = load again the next time).
  private loadedKey: string | null = null;


  constructor() {

    // Load when the tab is opened (again each time: the assignments tab
    // may have changed the counts) and when the term or class changes.
    effect(() => {

      const active = this.active();
      const termId = this.selection.termId();
      const classId = this.selection.classId();

      untracked(() => {

        if (!active) {
          this.loadedKey = null;
          return;
        }

        const key = termId !== null && classId !== null
          ? `${termId}-${classId}`
          : null;

        if (key === this.loadedKey) {
          return;
        }

        this.loadedKey = key;

        if (key === null) {
          this.dataRequest?.unsubscribe();
          this.plans.set([]);
          this.isLoading.set(false);
          return;
        }

        this.loadData();
      });
    });
  }


  // =========================
  // Loading
  // =========================

  // GET /api/subjectplans?academicTermId=&classId= + GET /api/subjects
  loadData(): void {

    const termId = this.selection.termId();
    const classId = this.selection.classId();

    if (termId === null || classId === null) {
      return;
    }

    this.dataRequest?.unsubscribe();

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dataRequest = forkJoin({
      plans: this.plansService.getPlans({ academicTermId: termId, classId }),
      subjects: this.subjectsService.getSubjects(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ plans, subjects }) => {

          if (!plans.success) {
            this.plans.set([]);
            this.errorMessage.set(this.apiMessageService.getMessage(plans));
            this.isLoading.set(false);
            return;
          }

          this.plans.set(plans.data);
          this.subjects.set(subjects.success ? subjects.data : []);
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load subject plans:', error);

          this.loadedKey = null;
          this.plans.set([]);
          this.errorMessage.set('SUBJECTS.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        },
      });
  }


  // "Retry": the terms and classes again when they failed, otherwise the plans.
  retry(): void {

    if (this.selection.errorMessage()) {
      this.selection.load(this.selection.termId(), this.selection.classId());
      return;
    }

    this.loadData();
  }


  // =========================
  // Selection changes
  // =========================

  onTermChange(termId: number): void {
    this.selection.selectTerm(termId);
  }

  onClassChange(classId: number): void {
    this.selection.selectClass(classId);
  }


  // =========================
  // Actions (Admin only)
  // =========================

  // "New plan" (page header, an empty card, or "Create the plan first" in the
  // assignments tab). The plans and subjects are loaded fresh, so the list
  // never offers a subject that already has a plan.
  openCreatePlan(preselectedSubjectId: number | null = null): void {

    const termId = this.selection.termId();
    const classId = this.selection.classId();

    if (termId === null || classId === null) {
      this.actionResult.show(
        'info',
        this.translate.instant('SUBJECTS.PLANS_TAB.SELECT_CLASS_FIRST')
      );
      return;
    }

    if (this.openingForm()) {
      return;
    }

    this.openingForm.set(true);

    forkJoin({
      plans: this.plansService.getPlans({ academicTermId: termId, classId }),
      subjects: this.subjectsService.getSubjects(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ plans, subjects }) => {

          this.openingForm.set(false);

          if (!plans.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(plans));
            return;
          }

          if (!subjects.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(subjects));
            return;
          }

          this.plans.set(plans.data);
          this.subjects.set(subjects.data);

          const data: PlanFormData = {
            academicTermId: termId,
            classId,
            termLabel: this.selection.selectedTermLabel(),
            className: this.selection.selectedClassName(),
            subjects: this.subjectsWithoutPlan(),
            preselectedSubjectId,
          };

          this.dialog
            .open(PlanForm, {
              width: '760px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              data,
            })
            .afterClosed()
            .subscribe((plan?: SubjectPlan) => {
              if (plan) {
                this.loadData();
              }
            });
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to prepare the plan form:', error);

          this.openingForm.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // "Copy from an earlier term" (page header): into the selected term.
  openCopy(): void {

    const termId = this.selection.termId();

    if (termId === null) {
      return;
    }

    const data: CopyPlansData = {
      terms: this.selection.terms(),
      toTermId: termId,
    };

    this.dialog
      .open(CopyPlansDialog, {
        width: '520px',
        maxWidth: '95vw',
        data,
      })
      .afterClosed()
      .subscribe((result?: CopySubjectPlansResult) => {
        if (result && result.copiedCount > 0) {
          this.loadData();
        }
      });
  }
}
