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


// The Admin dashboard (spec: "SMS — مواصفات تصميم الكحلي والذهبي" → لوحة التحكم):
// main column  = today's attendance with the sections map, then the numbers strip;
// side column  = needs your attention, then the current term.
//
// TEMPORARY: the numbers come from dashboard-sample-data.ts until the
// backend endpoints are ready; then a service replaces DASHBOARD_SAMPLE_DATA
// and the "sample data" note is removed. The buttons have no action yet.
@Component({
  selector: 'app-admin-dashboard',
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
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {

  private readonly language = inject(Language);

  readonly data: DashboardData = DASHBOARD_SAMPLE_DATA;

  // Students, teachers, parents and classes (app-numbers-strip).
  readonly numbers = computed(() =>
    adminNumbers(this.data.stats, this.language.currentDirection() === 'rtl')
  );
}
