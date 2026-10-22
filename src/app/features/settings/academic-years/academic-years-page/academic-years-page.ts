import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiResponse } from '../../../../core/models/api-response';
import { AcademicYear } from '../../../../core/models/academic-year';
import { AcademicTerm } from '../../../../core/models/academic-term';
import { AcademicYearsService } from '../../../../core/services/academic-years';
import { AcademicTermsService } from '../../../../core/services/academic-terms';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { Permissions } from '../../../../core/services/permissions';
import { ActionResult } from '../../../../shared/services/action-result';

import {
  AcademicYearView,
  getYearStatus,
  GradesAction
} from '../academic-years';
import { CurrentTermBanner } from '../current-term-banner/current-term-banner';
import { YearCard } from '../year-card/year-card';
import {
  YearForm,
  YearFormData,
  YearFormResult
} from '../year-form/year-form';
import {
  TermForm,
  TermFormData,
  TermFormResult
} from '../term-form/term-form';
import {
  SetCurrentDialog,
  SetCurrentDialogData
} from '../set-current-dialog/set-current-dialog';
import {
  GradesStatusDialog,
  GradesStatusDialogData
} from '../grades-status-dialog/grades-status-dialog';

// /settings/academic-years
// The academic years of the school, each with its terms, and the current term.
// Admin: add / edit years and terms, activate / deactivate a term,
// set the current term, close / open a term's grades.
// AssistantPrincipal: read only (sees whether each term's grades are closed).
@Component({
  selector: 'app-academic-years-page',
  imports: [
    RouterLink,

    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    TranslatePipe,

    CurrentTermBanner,
    YearCard
  ],
  templateUrl: './academic-years-page.html',
  styleUrl: './academic-years-page.css',
})
export class AcademicYearsPage {

  private readonly yearsService = inject(AcademicYearsService);
  private readonly termsService = inject(AcademicTermsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly dialog = inject(MatDialog);
  private readonly language = inject(Language);
  private readonly permissions = inject(Permissions);
  private readonly destroyRef = inject(DestroyRef);

  // Only the Admin can change years and terms.
  // The Assistant Principal can only read (the backend answers 403 on writes).
  readonly canManage = this.permissions.canManageAcademicYears;

  // One card per year, newest first.
  readonly years = signal<AcademicYearView[]>([]);

  readonly isLoading = signal(false);

  // API message or translation key, shown instead of the page content.
  readonly errorMessage = signal('');

  // ids of the year cards that are open.
  readonly expandedYearIds = signal<number[]>([]);

  // id of the term being activated / deactivated or set as current
  // (prevents repeated clicks while the request runs).
  readonly busyTermId = signal<number | null>(null);

  // First load: nothing on the screen yet, so a big spinner is shown.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.years().length === 0
  );

  // Reload: the cards stay with a thin progress bar on top.
  readonly isRefreshing = computed(() =>
    this.isLoading() && this.years().length > 0
  );

  readonly currentYear = computed(() =>
    this.years().find(view => view.year.isCurrent)?.year ?? null
  );

  readonly currentTerm = computed(() => {
    for (const view of this.years()) {
      const term = view.terms.find(item => item.isCurrent);

      if (term) {
        return term;
      }
    }

    return null;
  });

  // The cards are opened automatically only on the first load.
  private hasLoadedOnce = false;

  constructor() {
    this.loadData();
  }


  // =========================
  // Loading
  // =========================

  // GET /api/academicyears + GET /api/academicterms, in parallel.
  // A school has only a few years, so everything comes in one go
  // and the terms are grouped by year here.
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

          // Business error in one of the two lists: show its message.
          const failed: ApiResponse<unknown> | null =
            !years.success ? years : !terms.success ? terms : null;

          if (failed) {
            this.years.set([]);
            this.errorMessage.set(this.apiMessageService.getMessage(failed));
            this.isLoading.set(false);
            return;
          }

          this.years.set(this.buildViews(years.data, terms.data));
          this.openDefaultCard();
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load academic years:', error);

          this.years.set([]);
          this.errorMessage.set('ACADEMIC_YEARS.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        }
      });
  }

  retry(): void {
    this.loadData();
  }

  // Years newest first (by startDate), each with its terms by termNumber.
  private buildViews(
    years: AcademicYear[],
    terms: AcademicTerm[]
  ): AcademicYearView[] {

    const currentYear = years.find(year => year.isCurrent) ?? null;

    return [...years]
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map(year => ({
        year,
        terms: terms
          .filter(term => term.academicYearId === year.academicYearId)
          .sort((a, b) => a.termNumber - b.termNumber),
        status: getYearStatus(year, currentYear)
      }));
  }

  // First load: open the current year (or the newest one if none is current).
  // Later reloads keep the cards the user opened or closed.
  private openDefaultCard(): void {

    if (this.hasLoadedOnce) {
      return;
    }

    this.hasLoadedOnce = true;

    const views = this.years();
    const first = views.find(view => view.year.isCurrent) ?? views[0];

    if (first) {
      this.expandedYearIds.set([first.year.academicYearId]);
    }
  }


  // =========================
  // Cards
  // =========================

  isExpanded(yearId: number): boolean {
    return this.expandedYearIds().includes(yearId);
  }

  toggleYear(yearId: number): void {
    this.expandedYearIds.update(ids =>
      ids.includes(yearId)
        ? ids.filter(id => id !== yearId)
        : [...ids, yearId]
    );
  }


  // =========================
  // Years
  // =========================

  // POST /api/academicyears
  openAddYear(): void {
    this.openYearForm({});
  }

  // PUT /api/academicyears/{id}
  openEditYear(year: AcademicYear): void {
    this.openYearForm({ year });
  }

  private openYearForm(data: YearFormData): void {
    this.dialog
      .open<YearForm, YearFormData, YearFormResult>(YearForm, {
        width: '520px',
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data
      })
      .afterClosed()
      .subscribe(result => {
        if (result?.success) {
          this.loadData();
        }
      });
  }


  // =========================
  // Terms
  // =========================

  // POST /api/academicterms (the year comes from the card).
  openAddTerm(view: AcademicYearView): void {
    this.openTermForm({ year: view.year, yearTerms: view.terms });
  }

  // PUT /api/academicterms/{id}
  openEditTerm(view: AcademicYearView, term: AcademicTerm): void {
    this.openTermForm({ year: view.year, yearTerms: view.terms, term });
  }

  private openTermForm(data: TermFormData): void {
    this.dialog
      .open<TermForm, TermFormData, TermFormResult>(TermForm, {
        width: '540px',
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data
      })
      .afterClosed()
      .subscribe(result => {
        if (result?.success) {

          // A new term opens its year card, so the user sees it.
          this.expandedYearIds.update(ids =>
            ids.includes(data.year.academicYearId)
              ? ids
              : [...ids, data.year.academicYearId]
          );

          this.loadData();
        }
      });
  }

  // Activate / deactivate: PUT /api/academicterms/{id} with the same data
  // and only isActive changed (there is no separate status endpoint).
  // The current term can never be deactivated.
  toggleTermStatus(term: AcademicTerm): void {

    if (this.busyTermId() !== null) {
      return;
    }

    if (term.isCurrent && term.isActive) {
      return;
    }

    this.busyTermId.set(term.academicTermId);

    this.termsService
      .updateAcademicTerm(term.academicTermId, {
        termNumber: term.termNumber,
        nameAr: term.nameAr,
        nameEn: term.nameEn,
        startDate: term.startDate,
        endDate: term.endDate,
        isActive: !term.isActive
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.busyTermId.set(null);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.loadData();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to update term status:', error);

          this.busyTermId.set(null);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }

  // PATCH /api/academicterms/{id}/current, after the confirmation dialog.
  // The backend also makes the term's year current, so everything is reloaded.
  confirmSetCurrent(view: AcademicYearView, term: AcademicTerm): void {

    if (this.busyTermId() !== null || !term.isActive) {
      return;
    }

    const data: SetCurrentDialogData = {
      term,
      year: view.year,
      currentTerm: this.currentTerm(),
      currentYear: this.currentYear()
    };

    this.dialog
      .open<SetCurrentDialog, SetCurrentDialogData, boolean>(SetCurrentDialog, {
        width: '480px',
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.setCurrentTerm(term);
        }
      });
  }

  private setCurrentTerm(term: AcademicTerm): void {

    this.busyTermId.set(term.academicTermId);

    this.termsService
      .setCurrentAcademicTerm(term.academicTermId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.busyTermId.set(null);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          // Open the card of the new current year.
          this.expandedYearIds.update(ids =>
            ids.includes(term.academicYearId)
              ? ids
              : [...ids, term.academicYearId]
          );

          this.loadData();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to set the current term:', error);

          this.busyTermId.set(null);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }


  // =========================
  // Term grades (close / open)
  // =========================

  // Close: PATCH /api/academicterms/{id}/grades/close
  // Open:  PATCH /api/academicterms/{id}/grades/open
  // Both after the confirmation dialog. A term closed by the year-end
  // rollover can never be opened (the card shows that item disabled,
  // and the backend answers 400 anyway).
  confirmGradesStatus(
    view: AcademicYearView,
    term: AcademicTerm,
    action: GradesAction
  ): void {

    if (this.busyTermId() !== null) {
      return;
    }

    if (action === 'open' && term.gradesClosedByRollover) {
      return;
    }

    this.dialog
      .open<GradesStatusDialog, GradesStatusDialogData, boolean>(GradesStatusDialog, {
        width: '480px',
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data: { term, year: view.year, action }
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.changeGradesStatus(term, action);
        }
      });
  }

  private changeGradesStatus(term: AcademicTerm, action: GradesAction): void {

    this.busyTermId.set(term.academicTermId);

    const request = action === 'close'
      ? this.termsService.closeGrades(term.academicTermId)
      : this.termsService.openGrades(term.academicTermId);

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.busyTermId.set(null);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.loadData();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error(`Failed to ${action} the term grades:`, error);

          this.busyTermId.set(null);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }

}
