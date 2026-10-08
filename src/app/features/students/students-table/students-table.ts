import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { Student } from '../student';

// id -> { ar, en } lookup used to display class and section names.
type NameLookup = Map<number, { ar: string; en: string }>;

@Component({
  selector: 'app-students-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './students-table.html',
  styleUrl: './students-table.css',
})
export class StudentsTable {

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // Students of the current page.
  readonly students = input<Student[]>([]);

  // Class and section names used to replace ids with readable names.
  readonly classNames = input<NameLookup>(new Map());
  readonly sectionNames = input<NameLookup>(new Map());

  // Loading and error state of the list.
  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Pagination state (pageNumber is 1-based).
  readonly totalCount = input(0);
  readonly pageNumber = input(1);
  readonly pageSize = input(10);

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly retry = output<void>();
  readonly pageChange = output<PageEvent>();
  readonly viewStudent = output<number>();
  readonly editStudent = output<number>();
  readonly toggleStatus = output<Student>();

  // Columns displayed in the students table.
  readonly displayedColumns = [
    'studentNumber',
    'name',
    'class',
    'section',
    'loginId',
    'status',
    'actions'
  ];


  getClassName(student: Student): string {

    const name = this.classNames().get(student.classId);

    if (!name) {
      return '—';
    }

    return document.documentElement.lang === 'ar'
      ? name.ar
      : name.en;

  }


  getSectionName(student: Student): string {

    const name = this.sectionNames().get(student.sectionId);

    if (!name) {
      return '—';
    }

    return document.documentElement.lang === 'ar'
      ? name.ar
      : name.en;

  }


  getStudentName(student: Student): string {

    const language = document.documentElement.lang;

    if (language === 'ar') {

      return [
        student.firstNameAr,
        student.fatherNameAr,
        student.grandFatherNameAr,
        student.familyNameAr
      ]
        .filter(Boolean)
        .join(' ');

    }

    return [
      student.firstNameEn,
      student.fatherNameEn,
      student.grandFatherNameEn,
      student.familyNameEn
    ]
      .filter(Boolean)
      .join(' ');

  }

}