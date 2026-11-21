import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  model,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { ATTENDANCE_ABSENT, AttendanceRecord } from '../../../../core/models/attendance';
import { Language } from '../../../../core/services/language';
import { formatAttendanceTime } from '../../shared/attendance-shared';
import {
  buildMonthWeeks,
  CalendarDay,
  CalendarMonth,
  formatLongDate,
  formatMonth,
  getMonths,
  getWeekdayNames,
  isSameMonth,
} from '../student-attendance';


// One day cell, ready to show. The words are translated in the template.
interface CalendarCell extends CalendarDay {
  dateLabel: string;            // "الخميس، 12 تشرين الثاني 2026"
  statusKey: string | null;     // ATTENDANCE.STATUS.ABSENT …, null = no mark
  recordedTime: string | null;  // "08:05 ص" (recorded days only)
  editedTime: string | null;
}


// The month calendar of one term (Sunday first).
//   present     ✓ in green, on a white day (so the month is not all green)
//   absent      ✕ on a light red day: the only coloured days
//   unrecorded  a dashed day with "—": neither present nor absent
//   off         a grey day (the school's weekly days off)
//   today       the number in a navy circle
// A recorded day takes the keyboard focus and shows when it was recorded
// (and edited) in a tooltip.
//
// The month is a two-way binding (model): the arrows change it here, and
// the page moves it when a day is picked in the list of days absent.
@Component({
  selector: 'app-attendance-calendar',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './attendance-calendar.html',
  styleUrl: './attendance-calendar.css',
})
export class AttendanceCalendar {

  private readonly language = inject(Language);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);


  // The records of the term shown, oldest first.
  readonly records = input.required<AttendanceRecord[]>();

  readonly weeklyDaysOff = input.required<readonly number[]>();

  // The days the term covers (see getCalendarRange).
  readonly range = input.required<{ from: string; to: string }>();

  readonly today = input.required<string>();

  // The day picked in the list of days absent (outlined), or null.
  readonly selectedDate = input<string | null>(null);

  readonly month = model.required<CalendarMonth>();


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Every month of the range: the arrows stop at both ends.
  readonly months = computed(() =>
    getMonths(this.range().from, this.range().to)
  );

  private readonly monthIndex = computed(() =>
    this.months().findIndex(m => isSameMonth(m, this.month()))
  );

  readonly hasPrevious = computed(() => this.monthIndex() > 0);

  readonly hasNext = computed(() =>
    this.monthIndex() >= 0 && this.monthIndex() < this.months().length - 1
  );

  readonly title = computed(() => formatMonth(this.month(), this.isArabic()));

  readonly weekdays = computed(() => getWeekdayNames(this.isArabic()));

  private readonly recordsByDate = computed(
    () => new Map(this.records().map(r => [r.date, r]))
  );

  // The counts of the month shown, next to its name.
  readonly monthCounts = computed(() => {

    const [year, month] = this.month();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;

    const inMonth = this.records().filter(r => r.date.startsWith(prefix));
    const absent = inMonth.filter(r => r.status === ATTENDANCE_ABSENT).length;

    return { absent, present: inMonth.length - absent };
  });

  readonly weeks = computed<(CalendarCell | null)[][]>(() => {

    const isArabic = this.isArabic();

    return buildMonthWeeks(
      this.month(),
      this.recordsByDate(),
      this.weeklyDaysOff(),
      this.range(),
      this.today()
    ).map(week => week.map(day => day ? this.toCell(day, isArabic) : null));
  });


  previous(): void {
    if (this.hasPrevious()) {
      this.month.set(this.months()[this.monthIndex() - 1]);
    }
  }

  next(): void {
    if (this.hasNext()) {
      this.month.set(this.months()[this.monthIndex() + 1]);
    }
  }

  // After the page picked a day absent: move the focus to its cell
  // (once the month is drawn), so keyboard users land on it.
  focusDay(date: string): void {
    afterNextRender(() => {
      this.host.nativeElement
        .querySelector<HTMLElement>(`[data-date="${date}"]`)
        ?.focus();
    }, { injector: this.injector });
  }


  private toCell(day: CalendarDay, isArabic: boolean): CalendarCell {

    return {
      ...day,
      dateLabel: formatLongDate(day.date, isArabic),
      statusKey: STATUS_KEYS[day.kind],
      recordedTime: day.record ? formatAttendanceTime(day.record.recordedAt, isArabic) : null,
      editedTime: day.record?.editedAt ? formatAttendanceTime(day.record.editedAt, isArabic) : null,
    };
  }
}


// The word of each kind of day (null = no mark, no word).
const STATUS_KEYS: Record<CalendarDay['kind'], string | null> = {
  present: 'ATTENDANCE.STATUS.PRESENT',
  absent: 'ATTENDANCE.STATUS.ABSENT',
  unrecorded: 'STUDENT_ATTENDANCE.CALENDAR.UNRECORDED',
  off: 'STUDENT_ATTENDANCE.CALENDAR.DAY_OFF',
  none: null,
};
