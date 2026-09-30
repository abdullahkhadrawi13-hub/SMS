import { Component, DestroyRef, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { MatMenuModule } from '@angular/material/menu';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  Students,
  PagedResult
} from '../../../core/services/students';

import { SchoolClassesService } from '../../../core/services/school-classes';

import {
  SectionsService,
  SectionPagedResult
} from '../../../core/services/sections';

import { Student } from '../student';

import { StudentDetails } from '../student-details/student-details';

import { StudentForm } from '../student-form/student-form';

import { StudentFilter } from '../student-filter/student-filter';

@Component({
  selector: 'app-student-list',

  imports: [
    CommonModule,

    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    TranslatePipe
  ],

  templateUrl: './student-list.html',

  styleUrl: './student-list.css'
})
export class StudentList {

  private readonly studentsService = inject(Students);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly dialog =
    inject(MatDialog);

  private readonly classesService =
    inject(SchoolClassesService);

  private readonly sectionsService =
    inject(SectionsService);

  // id -> { ar, en }
  private readonly classNames =
    signal<Map<number, { ar: string; en: string }>>(new Map());

  private readonly sectionNames =
    signal<Map<number, { ar: string; en: string }>>(new Map());


  readonly displayedColumns = [
    'studentNumber',
    'name',
    'class',
    'section',
    'loginId',
    'status',
    'actions'
  ];


  readonly students =
    signal<Student[]>([]);

  readonly totalCount =
    signal(0);

  readonly pageNumber =
    signal(1);

  readonly pageSize =
    signal(10);

  readonly search =
    signal('');

  readonly statusFilter =
    signal<boolean | undefined>(undefined);

  readonly isLoading =
    signal(false);

  readonly errorMessage =
    signal('');


  constructor() {

    this.loadLookups();

    this.loadStudents();

  }


  private loadLookups(): void {

    this.loadClassNames();

    this.loadSectionNames();

  }


  // الصفوف
  private loadClassNames(): void {

    this.classesService
      .getSchoolClasses(1, 1000)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: classes => {

          if (!classes.success) {
            return;
          }

          this.classNames.set(
            new Map(
              classes.data.items.map(c => [
                c.schoolClassId,
                { ar: c.classNameAr, en: c.classNameEn }
              ])
            )
          );

        },

        error: error => {
          console.error(
            'Failed to load classes:',
            error
          );
        }

      });

  }


  // الشعب: تحميل كل الصفحات مهما كان الحد الأقصى للـ pageSize في الـ backend
  private loadSectionNames(): void {

    this.sectionsService
      .getSections({ pageNumber: 1, pageSize: 100 })
      .pipe(

        switchMap(first => {

          if (!first.success) {
            return of([] as SectionPagedResult['items']);
          }

          const { items, totalPages, pageSize } = first.data;

          if (totalPages <= 1) {
            return of(items);
          }

          // نستخدم pageSize الفعلي الذي أرجعه السيرفر
          const remainingPages = Array.from(
            { length: totalPages - 1 },
            (_, i) =>
              this.sectionsService.getSections({
                pageNumber: i + 2,
                pageSize
              })
          );

          return forkJoin(remainingPages).pipe(
            map(pages => [
              ...items,
              ...pages.flatMap(p =>
                p.success ? p.data.items : []
              )
            ])
          );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe({

        next: sections => {

          this.sectionNames.set(
            new Map(
              sections.map(s => [
                s.sectionId,
                { ar: s.sectionAr, en: s.sectionEn }
              ])
            )
          );

        },

        error: error => {
          console.error(
            'Failed to load sections:',
            error
          );
        }

      });

  }


  getClassName(
    student: Student
  ): string {

    const name =
      this.classNames().get(student.classId);

    if (!name) {
      return '—';
    }

    return document.documentElement.lang === 'ar'
      ? name.ar
      : name.en;

  }


  getSectionName(
    student: Student
  ): string {

    const name =
      this.sectionNames().get(student.sectionId);

    if (!name) {
      return '—';
    }

    return document.documentElement.lang === 'ar'
      ? name.ar
      : name.en;

  }


  loadStudents(): void {

    this.isLoading.set(true);

    this.errorMessage.set('');

    this.studentsService
      .getStudents(
        this.pageNumber(),
        this.pageSize(),
        this.search(),
        undefined,
        undefined,
        this.statusFilter()
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          if (!response.success) {
            this.students.set([]);
            this.totalCount.set(0);
            this.errorMessage.set(response.message);
            this.isLoading.set(false);
            return;
          }

          const data: PagedResult<Student> = response.data;

          // لو الصفحة الحالية رجعت فاضية وهي مش أول صفحة
          // (مثلاً بعد تعطيل آخر طالب فيها) — ارجع صفحة للوراء وأعد التحميل
          if (data.items.length === 0 && data.pageNumber > 1) {
            this.pageNumber.set(data.pageNumber - 1);
            this.loadStudents();
            return;
          }

          this.students.set(data.items);
          this.totalCount.set(data.totalCount);
          this.pageNumber.set(data.pageNumber);
          this.pageSize.set(data.pageSize);
          this.isLoading.set(false);
        },


        error: error => {

          console.error(
            'Failed to load students:',
            error
          );


          this.students.set([]);

          this.totalCount.set(0);

          this.errorMessage.set(
            'STUDENTS.ERROR.LOAD_FAILED'
          );

          this.isLoading.set(false);

        }

      });

  }


  onSearch(): void {

    this.pageNumber.set(1);

    this.loadStudents();

  }


  clearSearch(): void {

    this.search.set('');

    this.pageNumber.set(1);

    this.loadStudents();

  }


  onStatusChange(
    value: boolean | undefined
  ): void {

    this.statusFilter.set(value);

    this.pageNumber.set(1);

    this.loadStudents();

  }


  onPageChange(
    event: PageEvent
  ): void {

    this.pageNumber.set(
      event.pageIndex + 1
    );

    this.pageSize.set(
      event.pageSize
    );

    this.loadStudents();

  }


  getStudentName(
    student: Student
  ): string {

    const language =
      document.documentElement.lang;


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


  openStudentDetails(
    studentId: number
  ): void {

    this.dialog.open(StudentDetails, {

      width: '850px',

      maxWidth: '95vw',

      maxHeight: '90vh',

      data: {
        studentId
      }

    });

  }


  openAddStudent(): void {

    const dialogRef =
      this.dialog.open(StudentForm, {

        width: '900px',

        maxWidth: '95vw',

        maxHeight: '90vh'

      });


    dialogRef
      .afterClosed()
      .subscribe(result => {

        if (result?.success) {

          this.loadStudents();

        }

      });

  }


  openEditStudent(
    studentId: number
  ): void {

    const dialogRef =
      this.dialog.open(StudentForm, {

        width: '900px',

        maxWidth: '95vw',

        maxHeight: '90vh',

        data: {
          studentId
        }

      });


    dialogRef
      .afterClosed()
      .subscribe(result => {

        if (result?.success) {

          this.loadStudents();

        }

      });

  }


  openFilter(): void {

    this.dialog.open(StudentFilter, {
      width: '420px'
    });

  }


  toggleStudentStatus(
    student: Student
  ): void {

    const newStatus =
      !student.isActive;


    this.studentsService
      .updateStudentStatus(
        student.studentId,
        newStatus
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          if (!response.success) {

            this.errorMessage.set(
              response.message
            );

            return;
          }


          this.loadStudents();

        },


        error: error => {

          console.error(
            'Failed to update student status:',
            error
          );


          this.errorMessage.set(
            'STUDENTS.ERROR.STATUS_UPDATE_FAILED'
          );

        }

      });

  }


  retry(): void {

    this.loadStudents();

  }

}