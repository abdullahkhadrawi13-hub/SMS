import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiResponse } from '../../../../core/models/api-response';
import { AcademicTerm } from '../../../../core/models/academic-term';
import { AcademicYear } from '../../../../core/models/academic-year';
import {
  RolloverPreview as RolloverPreviewData,
  RolloverResult as RolloverResultData
} from '../../../../core/models/rollover';
import { AcademicTermsService } from '../../../../core/services/academic-terms';
import { AcademicYearsService } from '../../../../core/services/academic-years';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { RolloverService } from '../../../../core/services/rollover';

import {
  buildDecisions,
  buildSourceOptions,
  countOutcomes,
  groupByClass,
  repeatStudentIds,
  RolloverDecisions
} from '../rollover';
import { RolloverRoute } from '../rollover-route/rollover-route';
import { RolloverPreview } from '../rollover-preview/rollover-preview';
import { RolloverDecisionChange } from '../rollover-class-group/rollover-class-group';
import { RolloverOpenTerms } from '../rollover-open-terms/rollover-open-terms';
import {
  RolloverConfirm,
  RolloverConfirmation
} from '../rollover-confirm/rollover-confirm';
import { RolloverResult } from '../rollover-result/rollover-result';


// After 5 wrong passwords (429) the run button waits this long.
const LOCK_MINUTES = 5;


// /settings/rollover (Admin only)
// Moves the students of an earlier term into the current term
// (API Reference, section 13), in the steps of a stepper:
//   1. Preview: the backend's suggestion for every student; the Admin
//      decides promote / repeat (new year) and must decide NeedsDecision.
//   2. Close the old year's grades (new year only).
//   3. Confirm: the Admin's password (and the year name for a new year).
// This page holds the state and talks to the API; the steps only show it.
@Component({
  selector: 'app-rollover-page',
  imports: [
    RouterLink,

    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    TranslatePipe,

    RolloverRoute,
    RolloverPreview,
    RolloverOpenTerms,
    RolloverConfirm,
    RolloverResult
  ],
  templateUrl: './rollover-page.html',
  styleUrl: './rollover-page.css',
})
export class RolloverPage {

  private readonly yearsService = inject(AcademicYearsService);
  private readonly termsService = inject(AcademicTermsService);
  private readonly rolloverService = inject(RolloverService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  // ===== Years and terms (for the "From term" list) =====

  private readonly years = signal<AcademicYear[]>([]);
  private readonly terms = signal<AcademicTerm[]>([]);

  readonly isLoading = signal(false);

  // API message or translation key, shown instead of the page.
  readonly errorMessage = signal('');

  // The current term, its year name and the terms before it.
  readonly source = computed(() =>
    buildSourceOptions(this.years(), this.terms())
  );

  readonly sourceTermId = signal<number | null>(null);


  // ===== Preview =====

  readonly preview = signal<RolloverPreviewData | null>(null);

  readonly isPreviewLoading = signal(false);

  readonly previewError = signal('');

  // The Admin's decisions (studentId -> promote / repeat / null).
  readonly decisions = signal<RolloverDecisions>({});

  // The step shown in the stepper.
  readonly stepIndex = signal(0);

  // The running preview request (a newer one cancels it).
  private previewRequest?: Subscription;


  // ===== Rollover =====

  readonly isRunning = signal(false);

  // 400 about the password: under the password field.
  readonly passwordError = signal('');

  // Any other error: above the buttons of the confirm step.
  readonly formError = signal('');

  // After 429 (5 wrong passwords): no new attempt for a few minutes.
  readonly isLocked = signal(false);

  // The answer of POST /api/rollover; replaces the stepper.
  readonly result = signal<RolloverResultData | null>(null);


  // ===== Computed =====

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly groups = computed(() =>
    groupByClass(this.preview()?.students ?? [])
  );

  readonly tally = computed(() =>
    countOutcomes(this.preview()?.students ?? [], this.decisions())
  );

  // Step 1 is done when no NeedsDecision student is left undecided.
  readonly isPreviewDone = computed(() => this.tally().pending === 0);

  // Step 2 is done when every term of the old year is closed.
  readonly isTermsDone = computed(() =>
    (this.preview()?.openTerms.length ?? 0) === 0
  );

  // First load: nothing to show yet, so a big spinner.
  readonly isFirstPreviewLoad = computed(() =>
    this.isPreviewLoading() && this.preview() === null
  );

  // The terms of the old year (step 2), by termNumber.
  readonly fromYearTerms = computed(() => {
    const sourceTerm = this.terms().find(term =>
      term.academicTermId === this.sourceTermId()
    );

    if (!sourceTerm) {
      return [];
    }

    return this.terms()
      .filter(term => term.academicYearId === sourceTerm.academicYearId)
      .sort((a, b) => a.termNumber - b.termNumber);
  });

  // "First Term · 2026/2027"
  readonly toTermName = computed(() => {
    const { currentTerm, currentYearName } = this.source();

    if (!currentTerm) {
      return '';
    }

    const name = this.isArabic() ? currentTerm.nameAr : currentTerm.nameEn;

    return `${name} · ${currentYearName}`;
  });


  constructor() {
    this.loadData();
  }


  // =========================
  // Loading
  // =========================

  // GET /api/academicyears + GET /api/academicterms, then the first preview
  // from the term just before the current one.
  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      years: this.yearsService.getAcademicYears(),
      terms: this.termsService.getAcademicTerms()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ years, terms }) => {

          const failed: ApiResponse<unknown> | null =
            !years.success ? years : !terms.success ? terms : null;

          if (failed) {
            this.errorMessage.set(this.apiMessageService.getMessage(failed));
            this.isLoading.set(false);
            return;
          }

          this.years.set(years.data);
          this.terms.set(terms.data);
          this.isLoading.set(false);

          const first = this.source().options[0];

          if (first) {
            this.sourceTermId.set(first.term.academicTermId);
            this.loadPreview();
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load academic terms:', error);

          this.errorMessage.set('ROLLOVER.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        }
      });
  }

  // GET /api/rollover/preview?fromAcademicTermId={id}
  // keepState = the same preview again ("Check again", or after an error
  // when running): the decisions and the step stay as they are.
  // afterLoad = runs once the new preview is shown.
  loadPreview(
    keepState = false,
    afterLoad?: (preview: RolloverPreviewData) => void
  ): void {

    const termId = this.sourceTermId();

    if (termId === null) {
      return;
    }

    this.previewRequest?.unsubscribe();

    this.isPreviewLoading.set(true);
    this.previewError.set('');

    this.previewRequest = this.rolloverService
      .getPreview(termId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isPreviewLoading.set(false);

          if (!response.success) {
            this.preview.set(null);
            this.previewError.set(this.apiMessageService.getMessage(response));
            return;
          }

          const preview = response.data;

          this.decisions.set(
            buildDecisions(
              preview.students,
              keepState ? this.decisions() : {}
            )
          );

          this.preview.set(preview);

          if (!keepState) {
            this.stepIndex.set(0);
            this.clearRunErrors();
          }

          afterLoad?.(preview);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the rollover preview:', error);

          this.isPreviewLoading.set(false);
          this.preview.set(null);
          this.previewError.set(this.apiMessageService.getErrorMessage(error));
        }
      });
  }


  // =========================
  // Page events
  // =========================

  onSourceChange(termId: number): void {
    this.sourceTermId.set(termId);
    this.result.set(null);
    this.loadPreview();
  }

  onDecisionChange(change: RolloverDecisionChange): void {
    this.decisions.update(decisions => ({
      ...decisions,
      [change.studentId]: change.decision
    }));
  }

  // Step 2: the Admin closed terms on the academic years page.
  recheckTerms(): void {
    this.loadPreview(true);
  }

  // After the result: a fresh preview (the moved students come back
  // as "Already placed").
  startNewPreview(): void {
    this.result.set(null);
    this.loadPreview();
  }

  retry(): void {
    this.loadData();
  }

  retryPreview(): void {
    this.loadPreview();
  }


  // =========================
  // Rollover
  // =========================

  // POST /api/rollover
  run(confirmation: RolloverConfirmation): void {

    const preview = this.preview();

    if (!preview || this.isRunning() || this.isLocked()) {
      return;
    }

    // Cleared first, so the same message twice is shown as a new error.
    this.clearRunErrors();

    this.isRunning.set(true);

    this.rolloverService
      .rollover({
        fromAcademicTermId: preview.fromAcademicTermId,
        repeatStudentIds: preview.isNewYear
          ? repeatStudentIds(this.decisions())
          : [],
        adminPassword: confirmation.adminPassword,
        confirmYearName: preview.isNewYear
          ? confirmation.confirmYearName
          : null
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isRunning.set(false);

          if (!response.success) {
            this.showRunError(
              this.apiMessageService.getMessage(response),
              response.messageEn
            );
            return;
          }

          this.result.set(response.data);
        },

        error: (error: HttpErrorResponse) => {

          this.isRunning.set(false);

          // 401: the interceptor already logged the Admin out.
          if (error.status === 401) {
            return;
          }

          const message = this.apiMessageService.getErrorMessage(error);

          // 429: 5 wrong passwords (shared with the login).
          if (error.status === 429) {
            this.formError.set(message);
            this.lockRun();
            return;
          }

          if (error.status === 400) {
            this.showRunError(message, error.error?.messageEn ?? '');
            return;
          }

          console.error('Rollover failed:', error);

          this.formError.set(message);
        }
      });
  }

  // A 400 from the rollover.
  // The password errors go under the password field
  // ("Admin password is incorrect." / "Admin password is required.");
  // everything else above the buttons. Then the preview is loaded again:
  // if a term of the old year is still open, the Admin goes back to step 2.
  private showRunError(message: string, messageEn: string): void {

    if (messageEn.toLowerCase().includes('password')) {
      this.passwordError.set(message);
      return;
    }

    this.formError.set(message);

    this.loadPreview(true, preview => {
      if (preview.isNewYear && preview.openTerms.length > 0) {
        this.stepIndex.set(1);
      }
    });
  }

  private clearRunErrors(): void {
    this.passwordError.set('');
    this.formError.set('');
  }

  private lockRun(): void {
    this.isLocked.set(true);

    const timer = setTimeout(
      () => this.isLocked.set(false),
      LOCK_MINUTES * 60 * 1000
    );

    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }
}
