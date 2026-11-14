import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { pluralKey } from '../../../../shared/utils/plural';

import { DashboardStats as DashboardStatsData } from '../dashboard.models';


// The numbers strip of the Admin and AssistantPrincipal dashboards:
// students, teachers, parents and classes in one card split by lines,
// no icons (spec: الأرقام المجمّعة). A 2 × 2 grid on the phone.
@Component({
  selector: 'app-dashboard-stats',
  imports: [TranslatePipe],
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.css',
})
export class DashboardStats {

  private readonly language = inject(Language);

  readonly data = input.required<DashboardStatsData>();

  readonly pluralKey = pluralKey;

  // "الأول" and "العاشر" for "الأول إلى العاشر" (null when there are no classes).
  readonly classRange = computed(() => {
    const { firstClass, lastClass } = this.data();

    if (!firstClass || !lastClass) {
      return null;
    }

    const isArabic = this.language.currentDirection() === 'rtl';

    return {
      first: isArabic ? firstClass.nameAr : firstClass.nameEn,
      last: isArabic ? lastClass.nameAr : lastClass.nameEn,
    };
  });
}
