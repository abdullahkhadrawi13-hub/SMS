import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  AcademicTerm,
  AcademicTermsService
} from '../../../core/services/academic-terms';
import { ApiMessageService } from '../../../core/services/api-message';
import { AttendanceService } from '../../../core/services/attendance';
import { Language } from '../../../core/services/language';
import {
  ATTENDANCE_ABSENT,
  ATTENDANCE_PRESENT,
  AttendanceHistoryStats,
  AttendanceRecord,
  AttendanceStatus,
  formatAttendanceDate,
  formatAttendanceDateTime
} from '../attendance';

// One academic term in the term list.
// name = null when the name of the term could not be loaded.
interface AttendanceHistoryTerm {
  academicTermId: number;
  name: string | null;
}

// One row of the history table.
interface AttendanceHistoryRow {
  attendanceId: number;
  date: string;
  status: AttendanceStatus;
  recordedAt: string;

  // null = the record was never edited.
  editedAt: string | null;
}

// One student's attendance history.
// GET /api/attendance/by-student/{studentId} (Admin, AssistantPrincipal).
//
// It is shown inside the student details (the "Attendance" tab),
// so unlike the other attendance components it loads its own data:
// the parent only gives it the student id.
@Component({
  selector: 'app-attendance-history',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './attendance-history.html',
  styleUrl: './attendance-history.css',
})
export class AttendanceHistory implements OnInit {

  private readonly attendanceService = inject(AttendanceService);
  private readonly termsService = inject(AcademicTermsService);

  private readonly apiMessageService = inject(ApiMessageService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(Language);

  private readonly destroyRef = inject(DestroyRef);

  // ===== Input =====

  readonly studentId = input.required<number>();

  // ===== Data =====

  // Every record of the student, in every academic term (oldest first).
  readonly records = signal<AttendanceRecord[]>([]);

  // Used only to show the names of the terms.
  private readonly terms = signal<AcademicTerm[]>([]);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // The selected academic term. null = all terms.
  readonly termId = signal<number | null>(null);

  // Status values used in the template.
  readonly present = ATTENDANCE_PRESENT;
  readonly absent = ATTENDANCE_ABSENT;

  // Columns displayed in the history table.
  readonly displayedColumns = [
    'date',
    'status',
    'recordedAt',
    'editedAt'
  ];

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // The terms the student has records in (newest first).
  // The history covers every term, so the term is filtered here in the
  // frontend. The list is shown only when there is more than one term.
  readonly termOptions = computed<AttendanceHistoryTerm[]>(() => {

    const isArabic = this.isArabic();
    const terms = this.terms();

    const termIds: number[] = [];

    for (const record of this.records()) {
      if (!termIds.includes(record.academicTermId)) {
        termIds.push(record.academicTermId);
      }
    }

    return termIds
      .reverse()
      .map(academicTermId => {

        const term = terms.find(
          t => t.academicTermId === academicTermId
        );

        return {
          academicTermId,
          name: term
            ? this.getTermName(term, isArabic)
            : null
        };
      });
  });

  // The records of the selected term.
  private readonly filteredRecords = computed(() => {

    const termId = this.termId();

    return termId === null
      ? this.records()
      : this.records().filter(
          record => record.academicTermId === termId
        );
  });

  // There is no ready-made total in the API:
  // absent days = the number of records with status 1, counted here.
  readonly stats = computed<AttendanceHistoryStats>(() => {

    const records = this.filteredRecords();

    const absent = records.filter(
      record => record.status === ATTENDANCE_ABSENT
    ).length;

    return {
      recorded: records.length,
      present: records.length - absent,
      absent
    };
  });

  // Newest day first (the API sends the oldest first).
  readonly rows = computed<AttendanceHistoryRow[]>(() => {

    const isArabic = this.isArabic();

    return this.filteredRecords()
      .map(record => ({
        attendanceId: record.attendanceId,
        date: formatAttendanceDate(record.date, isArabic),
        status: record.status,
        recordedAt: formatAttendanceDateTime(record.recordedAt, isArabic),
        editedAt: record.editedAt
          ? formatAttendanceDateTime(record.editedAt, isArabic)
          : null
      }))
      .reverse();
  });


  ngOnInit(): void {
    this.loadHistory();
  }


  // GET /api/attendance/by-student/{studentId}
  loadHistory(): void {

    this.loading.set(true);
    this.errorMessage.set(null);

    this.attendanceService
      .getStudentAttendance(this.studentId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.loading.set(false);

          if (!response.success || !response.data) {
            this.records.set([]);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          const records = response.data;

          this.records.set(records);

          // Start with the term of the newest record (the last one).
          this.termId.set(
            records.length > 0
              ? records[records.length - 1].academicTermId
              : null
          );

          // The term names are needed only when there is a term list.
          if (this.termOptions().length > 1) {
            this.loadTerms();
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load attendance history:', error);

          this.loading.set(false);
          this.records.set([]);
          this.errorMessage.set(this.getErrorMessage(error));
        }
      });
  }

  // GET /api/academicterms (Admin only).
  // The AssistantPrincipal gets 403 here, so a failure is not an error:
  // the term list then shows "Term #id" instead of the name.
  private loadTerms(): void {

    this.termsService
      .getAcademicTerms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.terms.set(response.success ? response.data : []);
        },

        error: () => {
          this.terms.set([]);
        }
      });
  }

  onTermChange(termId: number | null): void {
    this.termId.set(termId);
  }


  // =========================
  // Helpers
  // =========================

  // "First Term (09/2025 - 01/2026)".
  // The dates are added because every year has a term with the same name.
  private getTermName(term: AcademicTerm, isArabic: boolean): string {

    const name = isArabic ? term.nameAr : term.nameEn;

    return `${name} (${this.getMonth(term.startDate)} - ${this.getMonth(term.endDate)})`;
  }

  // "2025-09-01T00:00:00" -> "09/2025"
  private getMonth(value: string): string {

    const [year, month] = value.slice(0, 7).split('-');

    return `${month}/${year}`;
  }

  private getErrorMessage(error: HttpErrorResponse): string {

    // 403 has no body, so the backend sends no message for it.
    if (error.status === 403) {
      return this.translate.instant('ATTENDANCE.ERRORS.FORBIDDEN');
    }

    return this.apiMessageService.getErrorMessage(error);
  }

}
