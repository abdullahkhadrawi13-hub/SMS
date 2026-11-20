import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';

import { StudentDashboardCard } from '../../../../core/models/dashboard';
import { StudentStatus } from '../../../../core/models/student';
import { ApiMessageService } from '../../../../core/services/api-message';
import { DashboardService } from '../../../../core/services/dashboard';
import { Language } from '../../../../core/services/language';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StateCard } from '../../../../shared/components/state-card/state-card';

import { NoticesCard } from '../../shared/notices-card/notices-card';
import { ChildCard } from '../child-card/child-card';
import { DashboardNotice } from '../../shared/dashboard.models';
import { getTermSubtitle } from '../../shared/term-subtitle';
import { isAbsentToday } from '../../shared/attendance-numbers';


// The Parent dashboard, from one request: GET /api/dashboard/parent/me.
// main column  = "أبنائي": one card per current child; the former children
//                (graduated, inactive, transferred) behind a button under them;
// side column  = needs your attention (absent today).
// The current term is in the page subtitle.
@Component({
  selector: 'app-parent-dashboard',
  imports: [TranslatePipe, MatIconModule, PageHeader, StateCard, NoticesCard, ChildCard],
  templateUrl: './parent-dashboard.html',
  styleUrl: '../../shared/dashboard-page.css',
})
export class ParentDashboard implements OnInit {

  private readonly dashboardService = inject(DashboardService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);

  readonly children = signal<StudentDashboardCard[]>([]);
  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // false after a 403 / 404: the error card shows no "Retry".
  readonly errorRetryable = signal(true);

  readonly currentChildren = computed(() => this.children().filter(child => child.studentStatus === StudentStatus.Active));
  readonly formerChildren = computed(() => this.children().filter(child => child.studentStatus !== StudentStatus.Active));

  readonly showFormer = signal(false);

  // Every child has the same current term: take the first one that has it.
  readonly subtitle = computed(() => {
    if (!this.isLoaded()) {
      return null;
    }
    // No children: the general line. Children but no current term:
    // "لا يوجد فصل دراسي حالي."
    if (this.children().length === 0) {
      return { key: 'DASHBOARD.PARENT.SUBTITLE', params: {} };
    }
    const term = this.children().find(child => child.currentTerm)?.currentTerm;
    return getTermSubtitle(term, this.language.currentDirection() === 'rtl');
  });

  readonly notices = computed<DashboardNotice[]>(() => {
    const isArabic = this.language.currentDirection() === 'rtl';

    return this.currentChildren()
      .filter(child => isAbsentToday(child))
      .map(child => ({
        id: `absent-${child.studentId}`,
        tone: 'bad' as const,
        titleKey: 'DASHBOARD.PARENT.NOTICES.ABSENT',
        titleParams: { name: (isArabic ? child.studentNameAr : child.studentNameEn).split(' ')[0] },
        parts: [{ key: 'DASHBOARD.PARENT.NOTICES.ABSENT_LINE' }],
      }));
  });


  ngOnInit(): void {
    this.load();
  }


  // GET /api/dashboard/parent/me
  load(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.errorRetryable.set(true);

    this.dashboardService
      .getParentMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);

          if (!response.success || !response.data) {
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            return;
          }

          this.children.set(response.data.children ?? []);
          this.isLoaded.set(true);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the parent dashboard:', error);

          this.isLoading.set(false);
          this.errorRetryable.set(error.status !== 403 && error.status !== 404);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }
}
