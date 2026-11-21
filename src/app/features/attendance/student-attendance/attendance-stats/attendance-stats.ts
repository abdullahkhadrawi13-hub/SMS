import { Component, computed, inject, input } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { AttendanceCounts, formatShortDate } from '../student-attendance';


// The numbers of one term, in one card split by lines:
// days absent (the biggest number: the page's question), days present,
// recorded days, and the attendance rate with the gold bar.
// The counts are the backend's (summary); the rate is present ÷ recorded.
@Component({
  selector: 'app-attendance-stats',
  imports: [TranslatePipe],
  templateUrl: './attendance-stats.html',
  styleUrl: './attendance-stats.css',
})
export class AttendanceStats {

  private readonly language = inject(Language);

  readonly counts = input.required<AttendanceCounts>();

  // "آخرها الخميس، 12 تشرين الثاني"
  readonly lastAbsence = computed(() => {
    const date = this.counts().lastAbsence;
    return date
      ? formatShortDate(date, this.language.currentDirection() === 'rtl')
      : null;
  });
}
