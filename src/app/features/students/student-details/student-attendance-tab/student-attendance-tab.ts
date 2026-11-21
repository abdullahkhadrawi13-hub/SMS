import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
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
import { DEFAULT_WEEKLY_DAYS_OFF } from '../../../../core/models/school-settings';
import { ApiResponse } from '../../../../core/models/api-response';
import { ApiMessageService } from '../../../../core/services/api-message';
import { AttendanceService } from '../../../../core/services/attendance';
import { SchoolSettingsService } from '../../../../core/services/school-settings';
import { StateCard } from '../../../../shared/components/state-card/state-card';
import {
  getDefaultTermId,
  getTermOptions,
  loadWeeklyDaysOff,
} from '../../../attendance/student-attendance/student-attendance';
import { TermAttendance } from '../../../attendance/student-attendance/term-attendance/term-attendance';
import { AttendanceTermSelect } from '../../../attendance/student-attendance/term-select/term-select';


// The "Attendance" tab of the student page (/students/:id?tab=attendance),
// Admin and AssistantPrincipal. The same numbers, month calendar and days
// absent as the student's «حضوري» page (app-term-attendance).
//
//   GET /api/attendance/by-student/{studentId}           every record
//   GET /api/attendance/summary/by-student/{studentId}   counts and term names
//   GET /api/schoolsettings/school                        weekly days off
//
// One term at a time: the current term first (else the newest with
// records); "Academic term" lists the others when there is more than one.
// The term names come with the summary, so GET /api/academicterms is no
// longer called here.
@Component({
  selector: 'app-student-attendance-tab',
  imports: [
    TranslatePipe,
    StateCard,
    TermAttendance,
    AttendanceTermSelect,
  ],
  templateUrl: './student-attendance-tab.html',
  styleUrl: './student-attendance-tab.css',
})
export class StudentAttendanceTab implements OnInit {

  private readonly attendanceService = inject(AttendanceService);
  private readonly schoolSettingsService = inject(SchoolSettingsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly destroyRef = inject(DestroyRef);


  // ===== Input =====

  readonly studentId = input.required<number>();


  // ===== Data =====

  // Every record of the student, in every academic term (oldest first).
  readonly records = signal<AttendanceRecord[]>([]);

  readonly summaries = signal<AttendanceTermSummary[]>([]);

  readonly weeklyDaysOff = signal<readonly number[]>(DEFAULT_WEEKLY_DAYS_OFF);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // The terms with records, newest first (the staff has no current term
  // without records here: the summary leaves such a term out).
  readonly termOptions = computed(() => getTermOptions(this.summaries(), null));

  readonly termId = linkedSignal(() => getDefaultTermId(this.termOptions()));

  readonly term = computed(() =>
    this.termOptions().find(t => t.academicTermId === this.termId()) ?? null
  );


  ngOnInit(): void {

    this.loadHistory();

    loadWeeklyDaysOff(this.schoolSettingsService)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(days => this.weeklyDaysOff.set(days));
  }


  loadHistory(): void {

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      records: this.attendanceService.getStudentAttendance(this.studentId()),
      summary: this.attendanceService.getStudentSummary(this.studentId()),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ records, summary }) => {

          this.loading.set(false);

          const failed = ([records, summary] as ApiResponse<unknown>[]).find(r => !r.success);

          if (failed) {
            this.records.set([]);
            this.summaries.set([]);
            this.errorMessage.set(this.apiMessageService.getMessage(failed));
            return;
          }

          this.records.set(records.data ?? []);
          this.summaries.set(summary.data?.terms ?? []);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load attendance history:', error);

          this.loading.set(false);
          this.records.set([]);
          this.summaries.set([]);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }
}
