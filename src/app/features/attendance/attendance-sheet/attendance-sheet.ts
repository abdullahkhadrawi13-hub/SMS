import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../core/services/language';
import {
  ATTENDANCE_ABSENT,
  ATTENDANCE_PRESENT,
  AttendanceDraft,
  AttendanceSheet as AttendanceSheetData,
  AttendanceSheetStats,
  AttendanceStatus,
  AttendanceStatusChange,
  formatAttendanceDate
} from '../attendance';

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

@Component({
  selector: 'app-attendance-sheet',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './attendance-sheet.html',
  styleUrl: './attendance-sheet.css',
})
export class AttendanceSheet {

  private readonly language = inject(Language);

  // ===== Inputs (all data is owned and loaded by the parent page) =====

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

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly statusChange = output<AttendanceStatusChange>();
  readonly markRemainingPresent = output<void>();
  readonly reset = output<void>();
  readonly save = output<void>();

  // Status values used in the template.
  readonly present = ATTENDANCE_PRESENT;
  readonly absent = ATTENDANCE_ABSENT;

  // Columns displayed in the sheet table.
  readonly displayedColumns = [
    'index',
    'studentNumber',
    'name',
    'status'
  ];

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

  // Save is allowed only when every student has a status
  // and there is something new to save.
  readonly canSave = computed(() =>
    !this.saving()
    && this.stats().unmarked === 0
    && this.stats().changes > 0
  );

}
