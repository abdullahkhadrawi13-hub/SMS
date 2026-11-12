import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import {
  formatAttendanceDate,
  fromApiDate,
  toApiDate
} from '../attendance-shared';

// The day of the daily summary and of the absentees tab, on the page
// background above their content: the date field, the "Today" button and
// the day written in words ("الخميس، 12/11/2026").
//
//   <app-day-bar
//     [date]="date()"
//     [maxDate]="maxDate"
//     [todayOnly]="todayOnly()"
//     (dateChange)="onDateChange($event)"
//   />
//
// - Dates use the API format: YYYY-MM-DD.
// - todayOnly (the attendance officer): no calendar, only "Today only"
//   and the day in words.
//
// The date field look is shared: styles.css (.field-box.is-date).
@Component({
  selector: 'app-day-bar',
  imports: [
    MatButtonModule,
    MatDatepickerModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './day-bar.html',
  styleUrl: './day-bar.css',
})
export class DayBar {

  private readonly language = inject(Language);

  // The selected day, and the last day that can be chosen (today).
  readonly date = input.required<string>();
  readonly maxDate = input.required<string>();

  // True for the attendance officer (my-access -> todayOnly: true).
  readonly todayOnly = input(false);

  // The day the user picked (the tab loads its data).
  readonly dateChange = output<string>();

  // The date picker works with Date objects.
  readonly dateValue = computed(() => fromApiDate(this.date()));
  readonly maxDateValue = computed(() => fromApiDate(this.maxDate()));

  readonly isToday = computed(() => this.date() === this.maxDate());

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // "السبت، 10/10/2026" or "Saturday, 10/10/2026".
  readonly displayDate = computed(() =>
    formatAttendanceDate(this.date(), this.isArabic())
  );


  onDateChange(value: Date | null): void {

    if (!value) {
      return;
    }

    this.dateChange.emit(toApiDate(value));
  }

  goToToday(): void {
    this.dateChange.emit(this.maxDate());
  }

}
