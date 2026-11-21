import {
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import {
  AttendanceRecord,
  AttendanceTermSummary,
} from '../../../../core/models/attendance';
import { StudentDashboardCard } from '../../../../core/models/dashboard';
import { DEFAULT_WEEKLY_DAYS_OFF } from '../../../../core/models/school-settings';
import { ApiResponse } from '../../../../core/models/api-response';
import { ApiMessageService } from '../../../../core/services/api-message';
import { AttendanceService } from '../../../../core/services/attendance';
import { DashboardService } from '../../../../core/services/dashboard';
import { Language } from '../../../../core/services/language';
import { SchoolSettingsService } from '../../../../core/services/school-settings';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StateCard } from '../../../../shared/components/state-card/state-card';

import { TermAttendance } from '../term-attendance/term-attendance';
import { AttendanceTermSelect } from '../term-select/term-select';
import {
  getDefaultTermId,
  getTermLabelParams,
  getTermOptions,
  loadWeeklyDaysOff,
} from '../student-attendance';


// The student's Attendance page («حضوري»). Route: /attendance (Student).
//
// Three requests together:
//   GET /api/dashboard/student/me      the current term (also before any
//                                      day is recorded)
//   GET /api/attendance/me             every record, every term
//   GET /api/attendance/summary/me     the counts per term
// and GET /api/schoolsettings/school for the weekly days off (never an error).
//
// The current term is shown first. "Academic term" in the header lists the
// earlier terms, only when there is more than one.
@Component({
  selector: 'app-my-attendance',
  imports: [
    TranslatePipe,
    PageHeader,
    StateCard,
    TermAttendance,
    AttendanceTermSelect,
  ],
  templateUrl: './my-attendance.html',
  styleUrl: './my-attendance.css',
})
export class MyAttendance implements OnInit {

  private readonly dashboardService = inject(DashboardService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly schoolSettingsService = inject(SchoolSettingsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  readonly card = signal<StudentDashboardCard | null>(null);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly summaries = signal<AttendanceTermSummary[]>([]);
  readonly weeklyDaysOff = signal<readonly number[]>(DEFAULT_WEEKLY_DAYS_OFF);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly errorRetryable = signal(true);

  // The data is on the page (the header shows the term list).
  readonly ready = computed(() => !this.loading() && !this.errorMessage());


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly termOptions = computed(() =>
    getTermOptions(this.summaries(), this.card()?.currentTerm ?? null)
  );

  // The term chosen in the header (the current one at first).
  readonly termId = linkedSignal(() => getDefaultTermId(this.termOptions()));

  readonly term = computed(() =>
    this.termOptions().find(t => t.academicTermId === this.termId()) ?? null
  );

  // The subtitle: always the current term (as on «علاماتي»).
  readonly currentTermLabel = computed(() => {
    const current = this.card()?.currentTerm;
    return current ? getTermLabelParams(current, this.isArabic()) : null;
  });


  ngOnInit(): void {

    this.load();

    loadWeeklyDaysOff(this.schoolSettingsService)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(days => this.weeklyDaysOff.set(days));
  }


  load(): void {

    this.loading.set(true);
    this.errorMessage.set('');
    this.errorRetryable.set(true);

    forkJoin({
      card: this.dashboardService.getStudentMe(),
      records: this.attendanceService.getMyAttendance(),
      summary: this.attendanceService.getMySummary(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ card, records, summary }) => {

          this.loading.set(false);

          const failed = ([card, records, summary] as ApiResponse<unknown>[]).find(r => !r.success);

          if (failed) {
            this.errorMessage.set(this.apiMessageService.getMessage(failed));
            return;
          }

          this.card.set(card.data ?? null);
          this.records.set(records.data ?? []);
          this.summaries.set(summary.data?.terms ?? []);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the attendance:', error);

          this.loading.set(false);

          // 404: the account has no student row.
          this.errorMessage.set(
            error.status === 404
              ? 'STUDENT_ATTENDANCE.NOT_FOUND'
              : this.apiMessageService.getErrorMessage(error)
          );
          this.errorRetryable.set(this.apiMessageService.canRetry(error));
        },
      });
  }
}
