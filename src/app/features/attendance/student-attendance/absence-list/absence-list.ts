import { Component, computed, inject, input, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { ATTENDANCE_ABSENT, AttendanceRecord } from '../../../../core/models/attendance';
import { Language } from '../../../../core/services/language';
import { formatAttendanceTime } from '../../shared/attendance-shared';
import { formatLongDate } from '../student-attendance';


interface AbsenceRow {
  attendanceId: number;
  date: string;
  dateLabel: string;     // "الخميس، 12 تشرين الثاني 2026"
  recordedTime: string;  // "08:05 ص"
}


// «أيام الغياب»: the term's days absent, newest first.
// Picking a day moves the calendar to its month and outlines it
// (the page does that through the pick output).
@Component({
  selector: 'app-absence-list',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './absence-list.html',
  styleUrl: './absence-list.css',
})
export class AbsenceList {

  private readonly language = inject(Language);

  // The records of the term shown, oldest first.
  readonly records = input.required<AttendanceRecord[]>();

  // "الفصل الأول" (the term's name, without the year).
  readonly termName = input.required<string>();

  readonly selectedDate = input<string | null>(null);

  readonly pick = output<string>();

  readonly rows = computed<AbsenceRow[]>(() => {

    const isArabic = this.language.currentDirection() === 'rtl';

    return this.records()
      .filter(record => record.status === ATTENDANCE_ABSENT)
      .map(record => ({
        attendanceId: record.attendanceId,
        date: record.date,
        dateLabel: formatLongDate(record.date, isArabic),
        recordedTime: formatAttendanceTime(record.recordedAt, isArabic),
      }))
      .reverse();
  });
}
