import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { DEFAULT_WEEKLY_DAYS_OFF } from '../../../core/models/school-settings';
import { SchoolSettingsService } from '../../../core/services/school-settings';

import { fromApiDate } from './attendance-shared';


// The school's weekly days off on the attendance page (22 Nov 2026).
// GET /api/schoolsettings/school (every signed-in user) → weeklyDaysOff,
// day numbers like Date.getDay() (0 Sunday … 6 Saturday).
//
// Provided by AttendancePage, so the page asks once and the record tab's
// selector and the day bar (summary, absentees) share the answer.
//
// The days off are only marked, never blocked: a day off can still be
// picked and recorded (a make-up school day).
//
//   - The calendar greys the days off. If the request failed, it uses the
//     backend's default (Friday and Saturday): it is only a look.
//   - The "day off" note and chip show only when the days off are known
//     (the request worked), so nothing says "day off" about a day the school
//     may have made a school day.
@Injectable()
export class AttendanceDaysOff {

  private readonly schoolSettingsService = inject(SchoolSettingsService);
  private readonly destroyRef = inject(DestroyRef);

  // The days off from the backend; null while loading or when the request failed.
  private readonly known = signal<readonly number[] | null>(null);

  // What the calendar greys: the known days, else the default.
  private readonly calendarDays = computed(
    () => this.known() ?? DEFAULT_WEEKLY_DAYS_OFF
  );

  // [dateClass] of mat-datepicker: 'is-day-off' on the days off of the
  // month view. A new function when the days change, so an open calendar
  // draws its cells again.
  readonly dateClass = computed<MatCalendarCellClassFunction<Date>>(() => {
    const days = this.calendarDays();

    return (date, view) =>
      view === 'month' && days.includes(date.getDay()) ? 'is-day-off' : '';
  });


  constructor() {
    this.schoolSettingsService
      .getSchoolInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.known.set(response.data.weeklyDaysOff);
          }
        },

        // Not an error for the user: the calendar keeps the default,
        // and no "day off" note shows.
        error: (error) => console.error('Failed to load the weekly days off:', error),
      });
  }


  // The day number (0 … 6) when this date ("YYYY-MM-DD") is a known
  // day off, otherwise null.
  dayOff(date: string): number | null {
    const days = this.known();

    if (days === null) {
      return null;
    }

    const day = fromApiDate(date).getDay();

    return days.includes(day) ? day : null;
  }

}
