import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherListDto } from '../../../core/services/teachers';


@Component({
  selector: 'app-teacher-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
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


  // ===== Outputs (the parent page performs the actual actions) =====

  readonly retry = output<void>();
  readonly pageChange = output<PageEvent>();
  readonly viewTeacher = output<number>();
  readonly editTeacher = output<number>();
  readonly toggleStatus = output<TeacherListDto>();


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
