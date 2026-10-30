import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { ApiMessageService } from '../../../../core/services/api-message';
import { AttendanceService } from '../../../../core/services/attendance';
import { AttendanceAccessService } from '../../../../core/services/attendance-access';
import { Language } from '../../../../core/services/language';
import {
  AttendanceSheetTarget,
  formatAttendanceDate,
  fromApiDate,
  toApiDate,
  todayApiDate
} from '../../shared/attendance-shared';
import { AttendanceDailySummary, AttendanceSummarySection } from '../../../../core/models/attendance';

// Recording state of one section on the selected day.
type SectionState = 'complete' | 'partial' | 'notStarted';

// One row of the sections table.
interface AttendanceSummaryRow {
  section: AttendanceSummarySection;
  className: string;
  sectionName: string;
  state: SectionState;

  // Recorded students as a percentage (0 - 100), for the progress bar.
  progress: number;
}

// The "Daily summary" tab of the attendance page
// (GET /api/attendance/daily-summary): which sections have attendance
// recorded on a day and how many students are absent in each.
// The tab loads its own data; the page only tells it when it is opened.
@Component({
  selector: 'app-daily-summary-tab',
  imports: [
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './daily-summary-tab.html',
  styleUrl: './daily-summary-tab.css',
})
export class DailySummaryTab {

  private readonly attendanceService = inject(AttendanceService);
  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);

  // ===== Inputs =====

  // Goes up by one every time the page opens this tab (or the tab is
  // clicked again): the tab then loads fresh numbers, because attendance
  // may have been changed in the record tab.
  readonly reloadKey = input(0);

  // ===== Outputs =====

  // The user wants to open the sheet of a section on the selected day
  // (the page moves to the record tab).
  readonly openSheet = output<AttendanceSheetTarget>();

  // ===== Access =====

  // The attendance officer (my-access -> todayOnly: true) sees today only,
  // so no date picker is shown.
  readonly todayOnly = this.attendanceAccess.todayOnly;

  // ===== State =====

  // Dates use the API format: YYYY-MM-DD. Future dates are not allowed.
  readonly maxDate = todayApiDate();
  readonly date = signal(this.maxDate);

  // The summary returned by the API (null = nothing loaded).
  readonly summary = signal<AttendanceDailySummary | null>(null);
  readonly loading = signal(false);

  // Error message text (already in the current language).
  readonly errorMessage = signal<string | null>(null);

  // The running request. A new request cancels the previous one,
  // so an old response never replaces a newer date.
  private summaryRequest?: Subscription;

  // ===== Loading modes =====

  // First load: no summary on the screen yet, so the big spinner shows.
  readonly isInitialLoading = computed(() =>
    this.loading() && this.summary() === null
  );

  // Reload (another date, or the tab opened again): the old numbers stay
  // on the screen with a thin progress bar on top, so nothing jumps.
  readonly isRefreshing = computed(() =>
    this.loading() && this.summary() !== null
  );

  // Columns displayed in the sections table.
  readonly displayedColumns = [
    'className',
    'section',
    'recorded',
    'absent',
    'state',
    'actions'
  ];

  // The date picker works with Date objects.
  readonly dateValue = computed(() => fromApiDate(this.date()));
  readonly maxDateValue = fromApiDate(this.maxDate);

  readonly isToday = computed(() => this.date() === this.maxDate);

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly displayDate = computed(() =>
    formatAttendanceDate(this.date(), this.isArabic())
  );

  // Sections that still need recording (not started or partial).
  readonly pendingSections = computed(() => {

    const summary = this.summary();

    return summary
      ? summary.totalSections - summary.completedSections
      : 0;
  });

  // Completed sections as a percentage (0 - 100), for the progress bar.
  readonly completedProgress = computed(() => {

    const summary = this.summary();

    return summary && summary.totalSections > 0
      ? Math.round(
          (summary.completedSections / summary.totalSections) * 100
        )
      : 0;
  });

  readonly rows = computed<AttendanceSummaryRow[]>(() => {

    const isArabic = this.isArabic();

    return (this.summary()?.sections ?? []).map(section => ({
      section,
      className: isArabic
        ? section.classNameAr
        : section.classNameEn,
      sectionName: isArabic
        ? section.sectionAr
        : section.sectionEn,
      state: this.getState(section),
      progress: section.studentCount > 0
        ? Math.round(
            (section.recordedCount / section.studentCount) * 100
          )
        : 0
    }));
  });


  constructor() {

    // Load every time the page opens the tab (0 = not opened yet).
    // untracked: only reloadKey starts a load, not the signals read inside it.
    effect(() => {
      if (this.reloadKey() > 0) {
        untracked(() => this.loadSummary());
      }
    });
  }


  // GET /api/attendance/daily-summary
  private loadSummary(): void {

    this.summaryRequest?.unsubscribe();

    // The old summary stays on the screen while the new one loads
    // (a thin progress bar shows on top of it).
    this.errorMessage.set(null);
    this.loading.set(true);

    this.summaryRequest = this.attendanceService
      .getDailySummary(this.date())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.loading.set(false);

          if (!response.success || !response.data) {
            this.summary.set(null);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.summary.set(response.data);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load attendance summary:', error);

          this.loading.set(false);
          this.summary.set(null);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        }
      });
  }


  onDateChange(value: Date | null): void {

    if (!value) {
      return;
    }

    this.changeDate(toApiDate(value));
  }

  goToToday(): void {
    this.changeDate(this.maxDate);
  }

  private changeDate(date: string): void {

    // The attendance officer cannot leave today
    if (this.todayOnly()) {
      return;
    }

    this.date.set(date);
    this.loadSummary();
  }

  // Opens the sheet of this section (on the selected day) in the record tab.
  openSectionSheet(section: AttendanceSummarySection): void {
    this.openSheet.emit({
      classId: section.classId,
      sectionId: section.sectionId,
      date: this.date()
    });
  }


  private getState(section: AttendanceSummarySection): SectionState {

    if (section.isComplete) {
      return 'complete';
    }

    return section.recordedCount > 0
      ? 'partial'
      : 'notStarted';
  }

}
