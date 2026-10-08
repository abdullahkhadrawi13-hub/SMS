import { Component, inject, OnInit, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import {
  TeacherListDto,
  TeachersService,
} from '../../../core/services/teachers';


@Component({
  selector: 'app-teacher-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './teacher-table.html',
  styleUrl: './teacher-table.css',
})
export class TeacherTable implements OnInit {

  // Service used to communicate with the Teachers API.
  private readonly teachersService = inject(TeachersService);


  // Columns displayed in the teacher table.
  readonly displayedColumns = [
    'teacherNumber',
    'name',
    'loginId',
    'phoneNumber',
    'status',
    'actions',
  ];


  // Stores the teachers returned by the API.
  readonly teachers = signal<TeacherListDto[]>([]);


  // Total number of teachers returned by the API.
  readonly totalCount = signal(0);


  // Current paginator page.
  readonly pageIndex = signal(0);


  // Current number of rows displayed per page.
  readonly pageSize = signal(10);


  // Indicates whether the table is currently loading.
  readonly loading = signal(false);


  ngOnInit(): void {

    // Load the first page when the component is initialized.
    this.loadTeachers();
  }


  // Loads teachers from the backend using the current pagination values.
  loadTeachers(): void {

    this.loading.set(true);

    this.teachersService
      .getTeachers(
        this.pageIndex() + 1,
        this.pageSize()
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.teachers.set([]);
            this.totalCount.set(0);
            this.loading.set(false);
            return;
          }

          this.teachers.set(response.data.items);
          this.totalCount.set(response.data.totalCount);

          this.loading.set(false);
        },

        error: () => {

          this.teachers.set([]);
          this.totalCount.set(0);

          this.loading.set(false);
        },
      });
  }


  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherListDto): string {

    return document.documentElement.lang === 'ar'
      ? `${teacher.firstNameAr} ${teacher.fatherNameAr} ${teacher.grandFatherNameAr} ${teacher.familyNameAr}`
      : `${teacher.firstNameEn} ${teacher.fatherNameEn} ${teacher.grandFatherNameEn} ${teacher.familyNameEn}`;
  }


  // Handles paginator changes and reloads the requested page.
  onPageChange(event: PageEvent): void {

    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);

    this.loadTeachers();
  }
}