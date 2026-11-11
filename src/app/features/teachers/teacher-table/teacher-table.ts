import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherListDto } from '../../../core/models/teacher';
import { Language } from '../../../core/services/language';
import { RangePaginatorIntl } from '../../../core/services/paginator-intl';
import { getFullName, getInitials, getShortName } from '../../../shared/utils/person-name';
import { StateCard } from '../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

// One teacher as the list shows it: the API data plus the names
// in the language of the page (computed once, not on every change check).
export interface TeacherRow extends TeacherListDto {
  fullName: string;
  shortName: string;
  initials: string;
  avatarTone: number;
}


// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css.
const AVATAR_TONES = 6;


@Component({
  selector: 'app-teacher-table',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    TranslatePipe,
    StateCard,
    StatusBadge,
  ],
  // The look is the shared "Data table" in styles.css (.data-card, .data-table…).
  templateUrl: './teacher-table.html',
  // "1–10 من 42" under this table, like the students table.
  providers: [
    { provide: MatPaginatorIntl, useClass: RangePaginatorIntl }
  ],
})
export class TeacherTable {

  private readonly language = inject(Language);

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // Teachers of the current page.
  readonly teachers = input<TeacherListDto[]>([]);

  // Loading and error state of the list.
  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Pagination state (pageNumber is 1-based).
  readonly totalCount = input(0);
  readonly pageNumber = input(1);
  readonly pageSize = input(10);

  // Shows "Edit", "Reset password" and "Activate / Deactivate" (Admin only).
  // "View" is shown for everyone.
  readonly canManage = input(false);

  // The last list used a search or a filter: the empty state says
  // "no teachers match" instead of "no teachers added yet".
  readonly hasQuery = input(false);

  // Under 720px: a two-line list instead of the table.
  readonly isPhone = input(false);

  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the table.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.teachers().length === 0
  );

  // Reload (page change, search, filter, after an edit):
  // the old rows stay on the screen with a thin progress bar on top,
  // so the table and the paginator do not disappear and jump.
  readonly isRefreshing = computed(() =>
    this.isLoading() && this.teachers().length > 0
  );

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly retry = output<void>();
  readonly pageChange = output<PageEvent>();
  readonly viewTeacher = output<number>();
  readonly editTeacher = output<number>();
  readonly toggleStatus = output<TeacherListDto>();
  readonly resetPassword = output<TeacherListDto>();

  // Columns displayed in the teachers table (the teacher first).
  readonly displayedColumns = [
    'name',
    'teacherNumber',
    'loginId',
    'phoneNumber',
    'status',
    'actions'
  ];


  // The teachers with their names in the language of the page.
  // Recomputed when the list or the language changes.
  readonly rows = computed<TeacherRow[]>(() => {

    const isArabic = this.language.currentDirection() === 'rtl';

    return this.teachers().map(teacher => ({
      ...teacher,
      fullName: getFullName(teacher, isArabic),
      shortName: getShortName(teacher, isArabic),
      initials: getInitials(teacher, isArabic),
      // The same colour for the same teacher, everywhere.
      avatarTone: (teacher.teacherId % AVATAR_TONES) + 1
    }));

  });

}
