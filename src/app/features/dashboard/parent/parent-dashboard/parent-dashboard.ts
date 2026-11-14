import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';

import { Language } from '../../../../core/services/language';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { getFirstName } from '../../../../shared/utils/person-name';

import { NoticesCard } from '../../shared/notices-card/notices-card';
import { CurrentTermCard } from '../../shared/current-term-card/current-term-card';
import { ChildCard } from '../child-card/child-card';
import {
  DashboardNotice,
  DashboardTerm,
  ParentDashboardData,
} from '../../shared/dashboard.models';
import {
  DASHBOARD_SAMPLE_DATA,
  PARENT_DASHBOARD_SAMPLE_DATA,
} from '../../shared/dashboard-sample-data';


// The Parent dashboard (spec: "SMS — مواصفات تصميم الكحلي والذهبي" → لوحة التحكم):
// main column  = "أبنائي": one card per child, one under the other;
// side column  = needs your attention (absent today, failed subjects),
//                then the current term.
// No button in the header.
//
// TEMPORARY: the numbers come from dashboard-sample-data.ts until the
// backend endpoints are ready (the absences wait for a parent attendance
// endpoint). The links have no action yet.
@Component({
  selector: 'app-parent-dashboard',
  imports: [
    TranslatePipe,
    MatIconModule,
    PageHeader,
    NoticesCard,
    CurrentTermCard,
    ChildCard,
  ],
  templateUrl: './parent-dashboard.html',
  // The page layout shared by the Teacher, Student and Parent dashboards.
  styleUrl: '../../shared/dashboard-page.css',
})
export class ParentDashboard {

  private readonly language = inject(Language);

  readonly data: ParentDashboardData = PARENT_DASHBOARD_SAMPLE_DATA;
  readonly term: DashboardTerm = DASHBOARD_SAMPLE_DATA.term;

  // Absent today first, then the failed subjects, child by child.
  // The texts avoid words that change with the child's gender
  // ("غائب / غائبة"), since the API does not send it.
  readonly notices = computed<DashboardNotice[]>(() => {
    const isArabic = this.language.currentDirection() === 'rtl';
    const children = this.data.children;

    const absent: DashboardNotice[] = children
      .filter(child => child.isAbsentToday)
      .map(child => ({
        id: `absent-${child.studentId}`,
        tone: 'bad',
        titleKey: 'DASHBOARD.PARENT.NOTICES.ABSENT',
        titleParams: { name: getFirstName(child, isArabic) },
        parts: [{ key: 'DASHBOARD.PARENT.NOTICES.ABSENT_LINE' }],
      }));

    const failed: DashboardNotice[] = children.flatMap(child =>
      child.failedSubjects.map(subject => ({
        id: `failed-${child.studentId}-${subject.nameEn}`,
        tone: 'warn' as const,
        titleKey: 'DASHBOARD.PARENT.NOTICES.FAILED',
        titleParams: {
          name: getFirstName(child, isArabic),
          subject: isArabic ? subject.nameAr : subject.nameEn,
        },
        parts: [{
          key: 'DASHBOARD.PARENT.NOTICES.FAILED_LINE',
          params: { total: subject.total, passing: subject.passingMark },
        }],
        linkKey: 'DASHBOARD.PARENT.NOTICES.GRADES',
      }))
    );

    return [...absent, ...failed];
  });
}
