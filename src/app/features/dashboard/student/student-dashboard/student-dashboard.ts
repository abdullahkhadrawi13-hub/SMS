import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';

import { StudentDashboardCard } from '../../../../core/models/dashboard';
import { ApiMessageService } from '../../../../core/services/api-message';
import { DashboardService } from '../../../../core/services/dashboard';
import { Language } from '../../../../core/services/language';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StateCard } from '../../../../shared/components/state-card/state-card';

import { DashboardNumbers } from '../../shared/dashboard-numbers/dashboard-numbers';
import { StudentMarksCard } from '../student-marks-card/student-marks-card';
import { StudentInfoCard } from '../student-info-card/student-info-card';
import { DashboardNumber, StudentInfo } from '../../shared/dashboard.models';
import { attendanceNumbers } from '../../shared/attendance-numbers';
import { getTermSubtitle } from '../../shared/term-subtitle';


// The Student dashboard, from one request: GET /api/dashboard/student/me.
//   main column = "آخر علاماتي" (the newest 5 marks), then the attendance numbers
//   side column = my information
// The current term is in the page subtitle ("الفصل الأول · 2026/2027").
// No current term (currentTerm: null): one message instead of the marks
// and the numbers; my information stays.
@Component({
  selector: 'app-student-dashboard',
  imports: [
    TranslatePipe,
    PageHeader,
    StateCard,
    DashboardNumbers,
    StudentMarksCard,
    StudentInfoCard,
  ],
  templateUrl: './student-dashboard.html',
  styleUrl: '../../shared/dashboard-page.css',
})
export class StudentDashboard implements OnInit {

  private readonly dashboardService = inject(DashboardService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);

  readonly card = signal<StudentDashboardCard | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // false after a 403 / 404: the error card shows no "Retry".
  readonly errorRetryable = signal(true);

  private readonly isArabic = computed(() => this.language.currentDirection() === 'rtl');

  readonly subtitle = computed(() => {
    const card = this.card();
    return card ? getTermSubtitle(card.currentTerm, this.isArabic()) : null;
  });

  readonly info = computed<StudentInfo | null>(() => {
    const card = this.card();
    return card && {
      studentNumber: card.studentNumber,
      classNameAr: card.classNameAr,
      classNameEn: card.classNameEn,
      sectionNameAr: card.sectionAr,
      sectionNameEn: card.sectionEn,
      studentStatus: card.studentStatus,
    };
  });

  readonly numbers = computed<DashboardNumber[]>(() => {
    const card = this.card();
    return card ? attendanceNumbers(card, this.isArabic(), true) : [];
  });


  ngOnInit(): void {
    this.load();
  }


  // GET /api/dashboard/student/me
  load(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.errorRetryable.set(true);

    this.dashboardService
      .getStudentMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);

          if (!response.success || !response.data) {
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            return;
          }

          this.card.set(response.data);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the student dashboard:', error);

          this.isLoading.set(false);
          this.errorRetryable.set(error.status !== 403 && error.status !== 404);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }
}
