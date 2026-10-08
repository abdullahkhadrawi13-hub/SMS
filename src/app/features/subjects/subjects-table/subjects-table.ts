import { Component } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';


// Temporary subject data used until the Subject API is ready.
interface SubjectRow {
  subjectId: number;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
}


@Component({
  selector: 'app-subjects-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-table.html',
  styleUrl: './subjects-table.css',
})
export class SubjectsTable {

  // Columns displayed in the subject table.
  readonly displayedColumns = [
    'subjectId',
    'name',
    'status',
    'actions',
  ];


  // Temporary subject data for previewing the table.
  readonly subjects: SubjectRow[] = [
    {
      subjectId: 1,
      nameAr: 'الرياضيات',
      nameEn: 'Mathematics',
      isActive: true,
    },
    {
      subjectId: 2,
      nameAr: 'اللغة العربية',
      nameEn: 'Arabic Language',
      isActive: true,
    },
    {
      subjectId: 3,
      nameAr: 'اللغة الإنجليزية',
      nameEn: 'English Language',
      isActive: true,
    },
    {
      subjectId: 4,
      nameAr: 'العلوم',
      nameEn: 'Science',
      isActive: true,
    },
    {
      subjectId: 5,
      nameAr: 'الاجتماعيات',
      nameEn: 'Social Studies',
      isActive: false,
    },
  ];


  // Current paginator page.
  pageIndex = 0;


  // Current number of rows displayed per page.
  pageSize = 10;


  // Returns the subject name according to the current language.
  getSubjectName(subject: SubjectRow): string {
    return document.documentElement.lang === 'ar'
      ? subject.nameAr
      : subject.nameEn;
  }


  // Handles paginator changes.
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}