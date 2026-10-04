import { Component } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

// Temporary teacher data used until the Teacher API is ready.
interface TeacherRow {
  teacherNumber: string;
  nameAr: string;
  nameEn: string;
  loginId: string;
  phoneNumber: string;
  isActive: boolean;
}

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
export class TeacherTable {

  // Columns displayed in the teacher table.
  readonly displayedColumns = [
    'teacherNumber',
    'name',
    'loginId',
    'phoneNumber',
    'status',
    'actions',
  ];

  // Temporary teacher data for previewing the table.
  readonly teachers: TeacherRow[] = [
    {
      teacherNumber: 'T-260001',
      nameAr: 'أحمد محمد',
      nameEn: 'Ahmad Mohammad',
      loginId: 'ahmad01',
      phoneNumber: '0791234567',
      isActive: true,
    },
    {
      teacherNumber: 'T-260002',
      nameAr: 'محمد علي',
      nameEn: 'Mohammad Ali',
      loginId: 'mohammad01',
      phoneNumber: '0781234567',
      isActive: true,
    },
    {
      teacherNumber: 'T-260003',
      nameAr: 'خالد حسن',
      nameEn: 'Khaled Hassan',
      loginId: 'khaled01',
      phoneNumber: '0771234567',
      isActive: false,
    },
  ];

  // Current paginator page.
  pageIndex = 0;

  // Current number of rows displayed per page.
  pageSize = 10;

  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherRow): string {
    return document.documentElement.lang === 'ar'
      ? teacher.nameAr
      : teacher.nameEn;
  }

  // Handles paginator changes.
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}