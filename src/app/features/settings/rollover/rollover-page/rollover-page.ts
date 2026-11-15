import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { forkJoin, Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiResponse } from '../../../../core/models/api-response';
import { AcademicTerm } from '../../../../core/models/academic-term';
import { AcademicYear } from '../../../../core/models/academic-year';
import {
  RolloverPreview as RolloverPreviewData,
  RolloverResult as RolloverResultData,
  RolloverSuggestion
} from '../../../../core/models/rollover';
import { AcademicTermsService } from '../../../../core/services/academic-terms';
import { AcademicYearsService } from '../../../../core/services/academic-years';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { RolloverService } from '../../../../core/services/rollover';
import { ActionResult } from '../../../../shared/services/action-result';
import { pluralKey } from '../../../../shared/utils/plural';
import { PHONE_QUERY } from '../../../../layouts/dashboard-layout/dashboard-layout';

import {
  buildDecisions,
  buildSourceOptions,
  countChangedDecisions,
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
import { RolloverThreshold } from '../rollover-threshold/rollover-threshold';
import { RolloverStepBar, StepBarTone } from '../rollover-step-bar/rollover-step-bar';
import {
  GradesStatusDialog,
  GradesStatusDialogData
} from '../../academic-years/grades-status-dialog/grades-status-dialog';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StateCard } from '../../../../shared/components/state-card/state-card';


// After 5 wrong passwords (429) the run button waits this long.
const LOCK_MINUTES = 5;


// The steps of a rollover. A same-year rollover has no "terms" step.
type RolloverStepKey = 'preview' | 'terms' | 'confirm';

interface RolloverStepView {
  key: RolloverStepKey;
  labelKey: string;
}

// The note at the start of a step bar.
interface StepNote {
  icon: string;
  tone: StepBarTone;
  key: string;
  count?: number;
}


// /settings/rollover (Admin only)
// Moves the students of an earlier term into the current term
// (API Reference, section 13), in steps (navy & gold, 15 Nov 2026):
//   1. Preview: the backend's suggestion for every student; the Admin
//      decides promote / repeat (new year) and must decide NeedsDecision.
//      For a new year, the rule behind "Repeat" (failed subjects) can be
//      changed here too; the preview is then loaded again.
//   2. Close the old year's grades (new year only).
//   3. Confirm: the Admin's password (and the year name for a new year).
// This page holds the state and talks to the API; the steps only show it.
// One exception: the rule card (RolloverThreshold) saves its own setting
// (PUT /api/schoolsettings/promotion) and only tells the page it was saved.
//
// The steps header is the page's own (not mat-stepper): a finished step
// shows ✓ and can be clicked to go back; a step not reached yet shows
// only its number, with no hover and no ✓, even when it is already
// ready (feedback of 22 Oct 2026). Each step ends with the sticky step bar,
// so "Next" is always in reach.
@Component({
  selector: 'app-rollover-page',
  imports: [
    RouterLink,

    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,

    RolloverRoute,
    RolloverPreview,
    RolloverOpenTerms,
    RolloverConfirm,
    RolloverResult,
    RolloverThreshold,
    RolloverStepBar,
    PageHeader,
    StateCard,
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
  private readonly actionResult = inject(ActionResult);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  // true when the screen is narrower than 720px (same as the layout):
  // the tables become two-line lists.
  readonly isPhone = signal(this.breakpoints.isMatched(PHONE_QUERY));


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

  // The step shown (an index in steps()).
  readonly stepIndex = signal(0);

  // The filter of step 1 (null = all students). Kept here, so the step
  // bar's "Show" link can choose "Needs a decision".
  readonly filter = signal<RolloverSuggestion | null>(null);

  // The rule card is being edited: "Next" waits until it is saved or
  // cancelled, so "Save" is the screen's one primary button.
  readonly isEditingRule = signal(false);

  // Step 2: the term whose grades are being closed from this page.
  readonly closingTermId = signal<number | null>(null);

  private readonly stepsNav = viewChild<ElementRef<HTMLElement>>('stepsNav');

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

  // The answer of POST /api/rollover; replaces the steps.
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

  // Decisions the Admin changed by hand (asked about before the rule
  // behind "Repeat" is saved, because the new preview resets them).
  readonly changedDecisions = computed(() =>
    countChangedDecisions(this.preview()?.students ?? [], this.decisions())
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

  // The steps of this preview: three for a new year, two in the same year.
  readonly steps = computed<RolloverStepView[]>(() => {
    if (this.preview()?.isNewYear) {
      return [
        { key: 'preview', labelKey: 'ROLLOVER.STEPS.PREVIEW' },
        { key: 'terms',   labelKey: 'ROLLOVER.STEPS.TERMS' },
        { key: 'confirm', labelKey: 'ROLLOVER.STEPS.CONFIRM' }
      ];
    }

    return [
      { key: 'preview', labelKey: 'ROLLOVER.STEPS.PREVIEW_SAME_YEAR' },
      { key: 'confirm', labelKey: 'ROLLOVER.STEPS.CONFIRM' }
    ];
  });

  readonly currentStep = computed<RolloverStepKey>(() => {
    const steps = this.steps();

    return steps[Math.min(this.stepIndex(), steps.length - 1)].key;
  });

  // Step 1 can be left when every decision is made and the rule card
  // is not being edited.
  readonly canLeavePreview = computed(() =>
    this.isPreviewDone() && !this.isEditingRule() && !this.isPreviewLoading()
  );

  // The note of step 1's bar.
  readonly previewNote = computed<StepNote>(() => {
    const preview = this.preview();
    const pending = this.tally().pending;

    if (!preview?.isNewYear) {
      return { icon: 'info', tone: 'muted', key: 'ROLLOVER.PREVIEW.SAME_YEAR_NOTE' };
    }

    if (this.isEditingRule()) {
      return { icon: 'edit', tone: 'muted', key: 'ROLLOVER.PREVIEW.EDITING_RULE' };
    }

    if (pending > 0) {
      return {
        icon: 'error',
        tone: 'warn',
        key: pluralKey('ROLLOVER.PREVIEW.PENDING', pending),
        count: pending
      };
    }

    return { icon: 'check_circle', tone: 'ok', key: 'ROLLOVER.PREVIEW.ALL_DECIDED' };
  });

  // The note of step 2's bar.
  readonly termsNote = computed<StepNote>(() => {
    const open = this.preview()?.openTerms.length ?? 0;

    return open === 0
      ? { icon: 'check_circle', tone: 'ok', key: 'ROLLOVER.TERMS.READY' }
      : {
          icon: 'lock_open',
          tone: 'warn',
          key: pluralKey('ROLLOVER.TERMS.OPEN_COUNT', open),
          count: open
        };
  });

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
    this.breakpoints
      .observe(PHONE_QUERY)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => this.isPhone.set(result.matches));

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
            this.filter.set(null);
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

  // Step 1: the rule behind "Repeat" was saved
  // (PUT /api/schoolsettings/promotion). A new preview brings the new
  // suggestions, and every decision goes back to its suggestion.
  onThresholdSaved(): void {
    this.loadPreview();
  }

  onFilterChange(filter: RolloverSuggestion | null): void {
    this.filter.set(filter);
  }

  // Step 1's bar: "Show" the students still waiting for a decision.
  showPending(): void {
    this.filter.set(RolloverSuggestion.NeedsDecision);

    this.scrollTo('rollover-preview');
  }


  // =========================
  // Steps
  // =========================

  next(): void {
    const step = this.currentStep();

    if (step === 'preview' && !this.canLeavePreview()) {
      return;
    }

    if (step === 'terms' && (!this.isTermsDone() || this.isPreviewLoading())) {
      return;
    }

    this.goToStep(this.stepIndex() + 1);
  }

  previous(): void {
    this.goToStep(this.stepIndex() - 1);
  }

  // A finished step in the header: back to it. Never forward.
  goToStep(index: number): void {

    const last = this.steps().length - 1;

    if (index < 0 || index > last || this.isRunning()) {
      return;
    }

    if (index > this.stepIndex() + 1) {
      return;
    }

    this.stepIndex.set(index);

    // The new step starts at the top of the screen.
    afterNextRender(
      () => this.stepsNav()?.nativeElement.scrollIntoView({ block: 'start' }),
      { injector: this.injector }
    );
  }

  private scrollTo(id: string): void {
    afterNextRender(
      () => document.getElementById(id)?.scrollIntoView({ block: 'start' }),
      { injector: this.injector }
    );
  }

  // Step 2: the Admin closed terms on the academic years page.
  recheckTerms(): void {
    this.loadPreview(true);
  }

  // Step 2: "Close grades" on an open term of the old year.
  // The same question as the academic years page (GradesStatusDialog),
  // then PATCH /api/academicterms/{id}/grades/close.
  confirmCloseTerm(termId: number): void {

    if (this.closingTermId() !== null) {
      return;
    }

    const term = this.terms().find(item => item.academicTermId === termId);
    const year = this.years().find(item => item.academicYearId === term?.academicYearId);

    if (!term || !year) {
      return;
    }

    this.dialog
      .open<GradesStatusDialog, GradesStatusDialogData, boolean>(GradesStatusDialog, {
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data: { term, year, action: 'close' }
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.closeTermGrades(term);
        }
      });
  }

  // After closing: the terms again (for the closing date), then the
  // preview again (its openTerms list decides whether "Next" is enabled).
  private closeTermGrades(term: AcademicTerm): void {

    this.closingTermId.set(term.academicTermId);

    this.termsService
      .closeGrades(term.academicTermId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.closingTermId.set(null);
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          this.closingTermId.set(null);

          this.actionResult.show('success', this.apiMessageService.getMessage(response));

          this.reloadTerms();

          // While it loads, the close buttons and "Check again" wait.
          this.loadPreview(true);
        },

        error: (error: HttpErrorResponse) => {

          this.closingTermId.set(null);

          // 401: the interceptor already logged the Admin out.
          if (error.status === 401) {
            return;
          }

          console.error('Failed to close the term grades:', error);

          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        }
      });
  }

  // GET /api/academicterms again (quietly: the page stays as it is).
  private reloadTerms(): void {
    this.termsService
      .getAcademicTerms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.terms.set(response.data);
          }
        },

        error: (error: HttpErrorResponse) =>
          console.error('Failed to reload the academic terms:', error)
      });
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
