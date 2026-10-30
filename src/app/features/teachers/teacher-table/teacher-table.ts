import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherListDto } from '../../../core/models/teacher';


@Component({
  selector: 'app-teacher-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './teacher-table.html',
  styleUrl: './teacher-table.css',
})
export class TeacherTable {

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

  // Shows the edit and activate / deactivate actions (Admin only).
  readonly canManage = input(false);

  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the content.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.teachers().length === 0
  );

  // Reload: the old data stays on the screen with a thin progress bar
  // on top, so the content does not disappear and jump.
  readonly isRefreshing = computed(() =>
    this.isLoading() && !(this.teachers().length === 0)
  );


  // ===== Outputs (the parent page performs the actual actions) =====

  readonly retry = output<void>();
  readonly pageChange = output<PageEvent>();
  readonly viewTeacher = output<number>();
  readonly editTeacher = output<number>();
  readonly toggleStatus = output<TeacherListDto>();
  readonly resetPassword = output<TeacherListDto>();


  // Columns displayed in the teacher table.
  readonly displayedColumns = [
    'teacherNumber',
    'name',
    'loginId',
    'phoneNumber',
    'status',
    'actions',
  ];


  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherListDto): string {

    return document.documentElement.lang === 'ar'
      ? `${teacher.firstNameAr} ${teacher.fatherNameAr} ${teacher.grandFatherNameAr} ${teacher.familyNameAr}`
      : `${teacher.firstNameEn} ${teacher.fatherNameEn} ${teacher.grandFatherNameEn} ${teacher.familyNameEn}`;
  }
}
