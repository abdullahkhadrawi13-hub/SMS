import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import {
  AttendanceRecord,
  AttendanceTermSummary,
} from '../../../../core/models/attendance';
import { Language } from '../../../../core/services/language';
import { todayApiDate } from '../../shared/attendance-shared';
import { AbsenceList } from '../absence-list/absence-list';
import { AttendanceCalendar } from '../attendance-calendar/attendance-calendar';
import { AttendanceStats } from '../attendance-stats/attendance-stats';
import {
  AttendanceTermOption,
  CalendarMonth,
  getCalendarRange,
  getCounts,
  getMonthOf,
  getTermLabelParams,
} from '../student-attendance';


// One term of one student's attendance:
//   the numbers (stats), then the month calendar and «أيام الغياب» side by side
//   (one under the other on the phone).
// Used by «حضوري», «حضور أبنائي» and the "Attendance" tab of the student page.
// The page loads the data; this only shows the chosen term.
@Component({
  selector: 'app-term-attendance',
  imports: [
    MatIconModule,
    TranslatePipe,
    AttendanceStats,
    AttendanceCalendar,
    AbsenceList,
  ],
  templateUrl: './term-attendance.html',
  styleUrl: './term-attendance.css',
})
export class TermAttendance {

  private readonly language = inject(Language);

  private readonly calendar = viewChild(AttendanceCalendar);


  // Every record of the student (every term), oldest first.
  readonly records = input.required<AttendanceRecord[]>();

  // The per-term counts (GET …/summary/…).
  readonly summaries = input.required<AttendanceTermSummary[]>();

  // The term shown.
  readonly term = input.required<AttendanceTermOption>();

  readonly weeklyDaysOff = input.required<readonly number[]>();


  readonly today = todayApiDate();

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly termRecords = computed(() =>
    this.records().filter(r => r.academicTermId === this.term().academicTermId)
  );

  readonly counts = computed(() =>
    getCounts(
      this.summaries().find(s => s.academicTermId === this.term().academicTermId) ?? null,
      this.termRecords()
    )
  );

  readonly range = computed(() =>
    getCalendarRange(this.termRecords(), this.term().isCurrent, this.today)
  );

  // The month shown: the last month of the term (today's month for the
  // current term). It starts again when another term is chosen.
  readonly month = linkedSignal<CalendarMonth>(() => getMonthOf(this.range().to));

  // The day picked in «أيام الغياب». Cleared when another term is chosen.
  readonly selectedDate = linkedSignal<string | null>(() => {
    this.term();
    return null;
  });

  readonly termName = computed(() =>
    getTermLabelParams(this.term(), this.isArabic()).term
  );

  readonly termLabel = computed(() =>
    getTermLabelParams(this.term(), this.isArabic())
  );


  // A day in «أيام الغياب»: its month, outlined, with the focus on it.
  showDay(date: string): void {
    this.month.set(getMonthOf(date));
    this.selectedDate.set(date);
    this.calendar()?.focusDay(date);
  }
}
