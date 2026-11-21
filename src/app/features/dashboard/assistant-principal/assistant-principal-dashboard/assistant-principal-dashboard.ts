import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Language } from '../../../../core/services/language';
import { NumbersStrip } from '../../../../shared/components/numbers-strip/numbers-strip';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

import { TodayAttendanceCard } from '../../shared/today-attendance-card/today-attendance-card';
import { AttentionCard } from '../../shared/attention-card/attention-card';
import { CurrentTermCard } from '../../shared/current-term-card/current-term-card';
import { DashboardData } from '../../shared/dashboard.models';
import { DASHBOARD_SAMPLE_DATA } from '../../shared/dashboard-sample-data';
import { adminNumbers } from '../../shared/admin-numbers';


// The AssistantPrincipal dashboard: the same cards as the Admin dashboard,
// without what the AssistantPrincipal has no right to (isAdmin = false):
//   - no "إضافة طالب" button (students are managed by the Admin only),
//   - "عرض الخطط" instead of "راجع الخطط", no "تغيير" for the attendance officer,
//   - no reminder to close the term's grades.
// "تسجيل الحضور" stays: the AssistantPrincipal can record and edit attendance.
//
// TEMPORARY: the numbers come from dashboard-sample-data.ts until the
// backend endpoints are ready (see admin-dashboard.ts).
@Component({
  selector: 'app-assistant-principal-dashboard',
  imports: [
    TranslatePipe,
    MatButtonModule,
    MatIconModule,
    PageHeader,
    TodayAttendanceCard,
    NumbersStrip,
    AttentionCard,
    CurrentTermCard,
  ],
  templateUrl: './assistant-principal-dashboard.html',
  styleUrl: './assistant-principal-dashboard.css'
})
export class AssistantPrincipalDashboard {

  private readonly language = inject(Language);

  readonly data: DashboardData = DASHBOARD_SAMPLE_DATA;

  // Students, teachers, parents and classes (app-numbers-strip).
  readonly numbers = computed(() =>
    adminNumbers(this.data.stats, this.language.currentDirection() === 'rtl')
  );
}
