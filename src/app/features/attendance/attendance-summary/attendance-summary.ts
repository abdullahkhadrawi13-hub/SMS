import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../core/services/language';
import {
  AttendanceDailySummary,
  AttendanceSummarySection,
  formatAttendanceDate,
  fromApiDate,
  toApiDate
} from '../attendance';

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

@Component({
  selector: 'app-attendance-summary',
  imports: [
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './attendance-summary.html',
  styleUrl: './attendance-summary.css',
})
export class AttendanceSummary {

  private readonly language = inject(Language);

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // The summary returned by the API (null = nothing loaded).
  readonly summary = input<AttendanceDailySummary | null>(null);

  // Dates use the API format: YYYY-MM-DD.
  readonly date = input.required<string>();
  readonly maxDate = input.required<string>();

  readonly loading = input(false);

  // Error message text (already in the current language).
  readonly errorMessage = input<string | null>(null);

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly dateChange = output<string>();

  // The user wants to open the sheet of this section on the selected day.
  readonly openSection = output<AttendanceSummarySection>();

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
  readonly maxDateValue = computed(() => fromApiDate(this.maxDate()));

  readonly isToday = computed(() => this.date() === this.maxDate());

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


  onDateChange(value: Date | null): void {

    if (!value) {
      return;
    }

    this.dateChange.emit(toApiDate(value));
  }

  goToToday(): void {
    this.dateChange.emit(this.maxDate());
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
