import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';

import { Language } from '../../../../core/services/language';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import {
  formatLongDate,
  fromApiDate,
} from '../../../settings/academic-years/academic-years';

import { DashboardTerm } from '../dashboard.models';


const DAY_MS = 24 * 60 * 60 * 1000;


// "الفصل الحالي" on every role dashboard:
// the term and its dates, the week of the term, and whether its grades
// are open or closed (areGradesClosed).
//
// isAdmin: only the Admin sees the reminder to close the grades
// (closing them is an Admin action on the academic years page).
// showYearsLink: the "السنوات والفصول الدراسية" link at the bottom. Off for
// the Teacher, Student and Parent, who cannot open the Settings pages.
@Component({
  selector: 'app-current-term-card',
  imports: [
    TranslatePipe,
    MatIconModule,
    StatusBadge,
  ],
  templateUrl: './current-term-card.html',
  styleUrl: './current-term-card.css',
})
export class CurrentTermCard {

  private readonly language = inject(Language);

  readonly data = input.required<DashboardTerm>();
  readonly isAdmin = input(false);
  readonly showYearsLink = input(true);

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly termName = computed(() =>
    this.isArabic() ? this.data().nameAr : this.data().nameEn
  );

  readonly startDate = computed(() =>
    formatLongDate(this.data().startDate, this.isArabic())
  );

  readonly endDate = computed(() =>
    formatLongDate(this.data().endDate, this.isArabic())
  );

  // The week of the term today ("11 من 20"), kept between 1 and the last week.
  readonly week = computed(() => {
    const start = fromApiDate(this.data().startDate).getTime();
    const end = fromApiDate(this.data().endDate).getTime();

    const total = Math.max(1, Math.ceil((end - start + DAY_MS) / (7 * DAY_MS)));
    const passed = Math.floor((Date.now() - start) / (7 * DAY_MS)) + 1;
    const current = Math.min(total, Math.max(1, passed));

    return {
      current,
      total,
      percent: Math.round((current / total) * 100),
    };
  });
}
