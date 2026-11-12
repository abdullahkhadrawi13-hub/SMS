import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import {
  AttendanceDraft,
  AttendanceSheetStats,
  AttendanceStatusChange,
  formatAttendanceDate
} from '../../shared/attendance-shared';
import {
  ATTENDANCE_ABSENT,
  ATTENDANCE_PRESENT,
  AttendanceSheet as AttendanceSheetData,
  AttendanceStatus
} from '../../../../core/models/attendance';
import { SaveBar } from '../../../../shared/components/save-bar/save-bar';
import { StateCard } from '../../../../shared/components/state-card/state-card';

// One row of the sheet table.
interface AttendanceSheetRow {
  studentId: number;
  studentNumber: string;
  name: string;

  // The status chosen on the screen (null = not chosen yet).
  current: AttendanceStatus | null;

  // True when the chosen status is different from the saved one.
  changed: boolean;
}

// The attendance sheet of one section on one day: the head (counters,
// progress, "the rest are present") and one row per student with a
// present / absent switch (two real radio buttons).
// It only shows the data and reports what the user does; the record tab
// owns the data and talks to the API.
@Component({
  selector: 'app-record-sheet',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    SaveBar,
    StateCard,
  ],
  templateUrl: './record-sheet.html',
  styleUrl: './record-sheet.css',
})
export class RecordSheet {

  private readonly language = inject(Language);

  // ===== Inputs (all data is owned and loaded by the record tab) =====

  // The sheet returned by the API (null = nothing loaded).
  readonly sheet = input<AttendanceSheetData | null>(null);

  // The status chosen on the screen for each student.
  readonly draft = input<AttendanceDraft>({});

  // Counters (total / present / absent / unmarked / changes).
  readonly stats = input.required<AttendanceSheetStats>();

  // Names of the selected class and section (already in the current language).
  readonly className = input('');
  readonly sectionName = input('');

  readonly loading = input(false);
  readonly saving = input(false);

  // Error message text (already in the current language).
  readonly errorMessage = input<string | null>(null);

  // ===== Outputs (the record tab performs the actual actions) =====

  readonly statusChange = output<AttendanceStatusChange>();
  readonly markRemainingPresent = output<void>();
  readonly reset = output<void>();
  readonly save = output<void>();

  // "Retry" on the error card.
  readonly retry = output<void>();

  // Status values used in the template.
  readonly present = ATTENDANCE_PRESENT;
  readonly absent = ATTENDANCE_ABSENT;

  // Students that have a status (present or absent), and the same number
  // as a percentage (0 - 100) for the progress bar.
  readonly marked = computed(
    () => this.stats().total - this.stats().unmarked
  );

  readonly progress = computed(() => {

    const total = this.stats().total;

    return total > 0
      ? Math.round((this.marked() / total) * 100)
      : 0;
  });

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly rows = computed<AttendanceSheetRow[]>(() => {

    const draft = this.draft();
    const isArabic = this.isArabic();

    return (this.sheet()?.students ?? []).map(student => {

      const current = draft[student.studentId] ?? null;

      return {
        studentId: student.studentId,
        studentNumber: student.studentNumber,
        name: isArabic
          ? student.studentNameAr
          : student.studentNameEn,
        current,
        changed: current !== student.status
      };
    });
  });

  readonly displayDate = computed(() => {

    const sheet = this.sheet();

    return sheet
      ? formatAttendanceDate(sheet.date, this.isArabic())
      : '';
  });

}
