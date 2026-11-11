import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { Student, StudentStatus } from '../../../core/models/student';
import { Language } from '../../../core/services/language';
import { RangePaginatorIntl } from '../../../core/services/paginator-intl';
import { getFullName, getInitials, getShortName } from '../../../shared/utils/person-name';
import { StateCard } from '../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StudentStatusBadge } from '../../../shared/components/student-status/student-status';

// One student as the list shows it: the API data plus the names
// in the language of the page (computed once, not on every change check).
export interface StudentRow extends Student {
  fullName: string;
  shortName: string;
  initials: string;
  classSection: string;
  avatarTone: number;
}


// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css.
const AVATAR_TONES = 6;


@Component({
  selector: 'app-students-table',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    TranslatePipe,
    StateCard,
    StatusBadge,
    StudentStatusBadge,
  ],
  // The look is the shared "Data table" in styles.css (.data-card, .data-table…).
  templateUrl: './students-table.html',
  // "1–10 من 531" under this table (the other lists keep "page 1 of 5").
  providers: [
    { provide: MatPaginatorIntl, useClass: RangePaginatorIntl }
  ],
})
export class StudentsTable {

  private readonly language = inject(Language);

  // For the template: StudentStatus.Active is "regular".
  readonly StudentStatus = StudentStatus;

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // Students of the current page.
  readonly students = input<Student[]>([]);

  // Loading and error state of the list.
  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Pagination state (pageNumber is 1-based).
  readonly totalCount = input(0);
  readonly pageNumber = input(1);
  readonly pageSize = input(10);

  // Shows "Edit" and "Activate / Deactivate" only for users
  // allowed to manage students. "View" is shown for everyone.
  readonly canManage = input(false);

  // The last list used a search or a filter: the empty state says
  // "no students match" instead of "no students added yet".
  readonly hasQuery = input(false);

  // Under 720px: a two-line list instead of the table.
  readonly isPhone = input(false);

  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the table.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.students().length === 0
  );

  // Reload (page change, search, filter, after an edit):
  // the old rows stay on the screen with a thin progress bar on top,
  // so the table and the paginator do not disappear and jump.
  readonly isRefreshing = computed(() =>
    this.isLoading() && this.students().length > 0
  );

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly retry = output<void>();
  readonly pageChange = output<PageEvent>();
  readonly viewStudent = output<number>();
  readonly editStudent = output<number>();
  readonly toggleStatus = output<Student>();
  readonly resetPassword = output<Student>();

  // Columns displayed in the students table (the student first).
  readonly displayedColumns = [
    'name',
    'studentNumber',
    'classSection',
    'loginId',
    'studentStatus',
    'status',
    'actions'
  ];


  // The students with their names in the language of the page.
  // Recomputed when the list or the language changes.
  readonly rows = computed<StudentRow[]>(() => {

    const isArabic = this.language.currentDirection() === 'rtl';

    return this.students().map(student => ({
      ...student,
      fullName: getFullName(student, isArabic),
      shortName: getShortName(student, isArabic),
      initials: getInitials(student, isArabic),
      classSection: this.getClassSection(student, isArabic),
      // The same colour for the same student, everywhere.
      avatarTone: (student.studentId % AVATAR_TONES) + 1
    }));

  });


  // "الثامن · ج": the names come with the student
  // (classNameAr / classNameEn, sectionAr / sectionEn).
  private getClassSection(student: Student, isArabic: boolean): string {

    const className = isArabic
      ? student.classNameAr || student.classNameEn
      : student.classNameEn || student.classNameAr;

    const sectionName = isArabic
      ? student.sectionAr || student.sectionEn
      : student.sectionEn || student.sectionAr;

    return `${className || '—'} · ${sectionName || '—'}`;

  }

}
