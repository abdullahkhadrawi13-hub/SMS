import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { StudentGradesReport } from '../../../../core/models/student-grades-report';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { StudentGradesService } from '../../../../core/services/student-grades';

import { GradeHistoryCache } from '../../grade-history-cache';
import { TermGrades } from '../term-grades/term-grades';
import { getTermLabelParams } from '../student-grades';


// One choice of the term field.
interface TermOption {
  academicTermId: number;
  label: { term: string; year: string };
  areGradesClosed: boolean;
}


// One student's grades in every term (the "Grades" tab of the student
// details). Admin and AssistantPrincipal, read only.
// GET /api/studentgrades/by-student/{studentId} without a query: every term,
// newest first, in one request. The term field only filters what is shown.
//
// Like the parents tab, the dialog creates it the first time the tab is
// opened and keeps it while the dialog is open (no second request).
//
// GradeHistoryCache: the history of each mark, kept while the dialog is open
// (opening the same mark twice does not call the API twice).
@Component({
  selector: 'app-student-grades-tab',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe,
    TermGrades,
  ],
  providers: [
    GradeHistoryCache,
  ],
  templateUrl: './student-grades-tab.html',
  styleUrl: './student-grades-tab.css',
})
export class StudentGradesTab implements OnInit {

  private readonly gradesService = inject(StudentGradesService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  // ===== Input =====

  readonly studentId = input.required<number>();


  // ===== Data =====

  readonly report = signal<StudentGradesReport | null>(null);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  // The selected term.
  readonly termId = signal<number | null>(null);


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly terms = computed(() => this.report()?.terms ?? []);

  readonly termOptions = computed<TermOption[]>(() => {

    const isArabic = this.isArabic();

    return this.terms().map(term => ({
      academicTermId: term.academicTermId,
      label: getTermLabelParams(term, isArabic),
      areGradesClosed: term.areGradesClosed,
    }));
  });

  readonly selectedTerm = computed(() =>
    this.terms().find(term => term.academicTermId === this.termId())
    ?? null
  );

  readonly selectedOption = computed(() =>
    this.termOptions().find(option => option.academicTermId === this.termId())
    ?? null
  );

  // Shown at the top of a mark's history.
  readonly studentName = computed(() => {

    const report = this.report();

    if (!report) {
      return '';
    }

    return this.isArabic()
      ? report.studentNameAr || report.studentNameEn
      : report.studentNameEn || report.studentNameAr;
  });


  ngOnInit(): void {
    this.load();
  }


  // GET /api/studentgrades/by-student/{studentId} (every term)
  load(): void {

    this.loading.set(true);
    this.errorMessage.set('');

    this.gradesService
      .getByStudent(this.studentId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.loading.set(false);

          if (!response.success || !response.data) {
            this.report.set(null);
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            return;
          }

          const terms = response.data.terms;

          this.report.set(response.data);

          // Start with the current term, else the newest one (the first).
          const start = terms.find(term => term.isCurrent) ?? terms[0];

          this.termId.set(start ? start.academicTermId : null);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the student\'s grades:', error);

          this.loading.set(false);
          this.report.set(null);

          // 404: the student does not exist.
          this.errorMessage.set(
            error.status === 404
              ? 'STUDENT_GRADES.NOT_FOUND'
              : this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }

  onTermChange(termId: number): void {
    this.termId.set(termId);
  }
}
