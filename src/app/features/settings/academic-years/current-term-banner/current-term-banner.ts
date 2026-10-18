import { Component, computed, inject, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicYear } from '../../../../core/models/academic-year';
import { AcademicTerm } from '../../../../core/models/academic-term';
import { Language } from '../../../../core/services/language';

import { countDays, formatLongDate, fromApiDate } from '../academic-years';

// Where today is inside the current term.
type TermPhase = 'not-started' | 'running' | 'ended';

// The current term of the school, at the top of the page.
// The days and the progress bar are worked out here from the term dates
// (they do not come from the API).
@Component({
  selector: 'app-current-term-banner',
  imports: [
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './current-term-banner.html',
  styleUrl: './current-term-banner.css',
})
export class CurrentTermBanner {

  private readonly language = inject(Language);

  // The term with isCurrent = true, and its year (null when none is set yet).
  readonly term = input<AcademicTerm | null>(null);
  readonly year = input<AcademicYear | null>(null);

  // Admin: the "no current term" message says how to set one.
  readonly canManage = input(false);

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly termName = computed(() => {
    const term = this.term();

    if (!term) {
      return '';
    }

    return this.isArabic() ? term.nameAr : term.nameEn;
  });

  readonly dateRange = computed(() => {
    const term = this.term();

    if (!term) {
      return '';
    }

    const isArabic = this.isArabic();

    return `${formatLongDate(term.startDate, isArabic)} — ${formatLongDate(term.endDate, isArabic)}`;
  });

  // Days of the term, days passed, days left and the bar width (0–100).
  readonly progress = computed(() => {
    const term = this.term();

    if (!term) {
      return null;
    }

    const start = fromApiDate(term.startDate);
    const end = fromApiDate(term.endDate);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const total = countDays(start, end);

    let phase: TermPhase;
    let elapsed: number;

    if (today < start) {
      phase = 'not-started';
      elapsed = 0;
    } else if (today > end) {
      phase = 'ended';
      elapsed = total;
    } else {
      phase = 'running';
      // Days before today (today itself is not counted as passed).
      elapsed = countDays(start, today) - 1;
    }

    return {
      phase,
      elapsed,
      remaining: total - elapsed,
      // Days until the term starts (only used when it has not started).
      untilStart: phase === 'not-started' ? countDays(today, start) - 1 : 0,
      percent: Math.round((elapsed / total) * 100)
    };
  });

}
