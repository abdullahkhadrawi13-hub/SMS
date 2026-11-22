import { Component, input, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { WEEK_DAYS } from '../school-info';


// One tile ticked (off: true) or unticked (off: false).
export interface DayOffChange {
  day: number;
  off: boolean;
}


// The 7 days of the week as tiles: one real checkbox each, ticked = a day off.
// Sunday … Saturday (0 … 6, like Date.getDay()), 7 in a row on the computer,
// 4 + 3 on the phone.
//
// The parent page owns the value (the weeklyDaysOff form control):
// it passes the days in and gets each tick back (dayToggle).
@Component({
  selector: 'app-school-days-off',
  imports: [
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './school-days-off.html',
  styleUrl: './school-days-off.css',
})
export class SchoolDaysOff {

  // The days off now (day numbers).
  readonly days = input.required<readonly number[]>();

  // Read-only (the AssistantPrincipal): the tiles show the days, nothing changes.
  readonly disabled = input(false);

  // Every day is ticked: the tiles get the red border.
  readonly invalid = input(false);

  // The id of the error line under the tiles, for aria-describedby.
  readonly describedBy = input<string | null>(null);

  // A tile was ticked or unticked.
  readonly dayToggle = output<DayOffChange>();

  readonly weekDays = WEEK_DAYS;


  isOff(day: number): boolean {
    return this.days().includes(day);
  }


  toggle(day: number, event: Event): void {
    const off = (event.target as HTMLInputElement).checked;

    this.dayToggle.emit({ day, off });
  }
}
