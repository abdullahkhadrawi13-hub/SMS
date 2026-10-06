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
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import {
  Students,
  PagedResult
} from '../../../core/services/students';

import { SchoolClassesService } from '../../../core/services/school-classes';

import {SectionsService,SectionSimpleDto} from '../../../core/services/sections';

import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';

import { Student } from '../student';

import { StudentsDetails } from '../students-details/students-details';

import { StudentsForm } from '../students-form/students-form';

import {
  StudentsFilter,
  StudentFilterValues
} from '../students-filter/students-filter';



@Component({
  selector: 'app-students-page',

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

  templateUrl: './students-page.html',
styleUrl: './students-page.css'
})
export class StudentsPage {

  private readonly studentsService = inject(Students);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly dialog =
    inject(MatDialog);

  private readonly classesService =
    inject(SchoolClassesService);

  private readonly sectionsService =
    inject(SectionsService);

  private readonly apiMessageService =
    inject(ApiMessageService);

  private readonly actionResult = inject(ActionResult);

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

  readonly classFilter =
    signal<number | undefined>(undefined);

  readonly sectionFilter =
    signal<number | undefined>(undefined);

  readonly isLoading =
    signal(false);

  readonly errorMessage =
    signal('');


  constructor() {

    this.loadLookups();

    this.loadStudents();

  }


  private loadLookups(): void {

    this.classesService
      .getSchoolClasses(1, 1000)
      .pipe(

        // 1) أسماء الصفوف
        tap(classes => {

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

        }),

        // 2) كل شعب كل صف عبر by-class
        //    (بدل GET /api/Sections الذي يعيد فقط الشعب المرتبطة بسجلات أكاديمية)
        switchMap(classes => {

          if (!classes.success || classes.data.items.length === 0) {
            return of([] as SectionSimpleDto[]);
          }

          const requests = classes.data.items.map(c =>
            this.sectionsService
              .getSectionsByClass(c.schoolClassId)
              .pipe(
                map(r => (r.success ? r.data : [])),
                catchError(error => {
                  console.error(
                    `Failed to load sections for class ${c.schoolClassId}:`,
                    error
                  );

                  return of([] as SectionSimpleDto[]);
                })
              )
          );

          return forkJoin(requests).pipe(
            map(groups => groups.flat())
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
            'Failed to load classes/sections:',
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
        this.classFilter(),
        this.sectionFilter(),
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

            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );

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

    this.dialog.open(StudentsDetails, {

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
      this.dialog.open(StudentsForm, {

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
      this.dialog.open(StudentsForm, {

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

    const current: StudentFilterValues = {
      classId: this.classFilter() ?? null,
      sectionId: this.sectionFilter() ?? null,
      isActive: this.statusFilter() ?? null
    };

    this.dialog
      .open(StudentsFilter, {
        width: '420px',
        data: current
      })
      .afterClosed()
      .subscribe((result?: StudentFilterValues) => {

        // Cancel / إغلاق النافذة بدون تطبيق
        if (!result) {
          return;
        }

        this.classFilter.set(result.classId ?? undefined);
        this.sectionFilter.set(result.sectionId ?? undefined);
        this.statusFilter.set(result.isActive ?? undefined);

        this.pageNumber.set(1);

        this.loadStudents();

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

          this.actionResult.error(
            this.apiMessageService.getMessage(response)
          );

          return;
        }


        this.loadStudents();

        this.actionResult.success(
          this.apiMessageService.getMessage(response)
        );

      },


      error: error => {

        console.error(
          'Failed to update student status:',
          error
        );


        this.actionResult.error(
          this.apiMessageService.getErrorMessage(error)
        );

      }

    });

}

  retry(): void {

    this.loadStudents();

  }

}