import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { DashboardNumber } from '../dashboard.models';


// A numbers strip for the Teacher, Student and Parent dashboards:
// a few numbers in one card split by 1px lines, no icons
// (spec: الأرقام المجمّعة). A 2 × 2 grid on the phone.
//
// The dashboard builds the items (DashboardNumber), so the same strip
// shows the teacher's sections, the student's subjects and each child's
// results. The Admin strip keeps its own component (dashboard-stats).
//
// embedded: no border of its own, smaller numbers (20px), a line above it:
// the strip inside a child's card on the Parent dashboard.
@Component({
  selector: 'app-dashboard-numbers',
  imports: [TranslatePipe],
  templateUrl: './dashboard-numbers.html',
  styleUrl: './dashboard-numbers.css',
})
export class DashboardNumbers {

  readonly items = input.required<DashboardNumber[]>();

  // Translation key of the strip's accessible name.
  readonly ariaKey = input('DASHBOARD.STATS.ARIA');

  readonly embedded = input(false);
}
