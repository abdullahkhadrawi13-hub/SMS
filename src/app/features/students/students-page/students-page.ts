import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PageEvent } from '@angular/material/paginator';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Students } from '../../../core/services/students';
import { PagedResult } from '../../../core/models/paged-result';

import { ApiMessageService } from '../../../core/services/api-message';
import { Permissions } from '../../../core/services/permissions';
import { ActionResult } from '../../../shared/services/action-result';

import { Student } from '../../../core/models/student';

import { StudentsForm } from '../students-form/students-form';

import {
  StudentsFilter,
  StudentFilterValues
} from '../students-filter/students-filter';

import { StudentsHeader } from '../students-header/students-header';
import { StudentsSearch } from '../students-search/students-search';
import { StudentsTable } from '../students-table/students-table';



@Component({
  selector: 'app-students-page',

  imports: [
    StudentsHeader,
    StudentsSearch,
    StudentsTable,

    MatButtonModule,
    MatIconModule,
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

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly apiMessageService =
    inject(ApiMessageService);

  private readonly actionResult = inject(ActionResult);

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);

  // Only the Admin can add, edit, activate or deactivate students.
  // The Assistant Principal and the teacher can only read.
  readonly canManage = this.permissions.canManageStudents;

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

    // Restore the search, filter and page from the URL
    // (e.g. after "Back" from a student's page, or a refresh).
    this.readStateFromUrl(this.route.snapshot.queryParamMap);

    this.loadStudents();

  }


  // ===== List state in the URL =====
  // /students?search=..&classId=..&sectionId=..&isActive=..&page=..&pageSize=..
  // Empty values are left out, so the plain list stays /students.

  private readStateFromUrl(params: ParamMap): void {

    this.search.set(params.get('search') ?? '');

    this.classFilter.set(this.toPositiveNumber(params.get('classId')));
    this.sectionFilter.set(this.toPositiveNumber(params.get('sectionId')));

    const isActive = params.get('isActive');
    this.statusFilter.set(
      isActive === 'true' ? true : isActive === 'false' ? false : undefined
    );

    this.pageNumber.set(this.toPositiveNumber(params.get('page')) ?? 1);
    this.pageSize.set(this.toPositiveNumber(params.get('pageSize')) ?? 10);

  }


  private writeStateToUrl(): void {

    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        search: this.search().trim() || null,
        classId: this.classFilter() ?? null,
        sectionId: this.sectionFilter() ?? null,
        isActive: this.statusFilter() ?? null,
        page: this.pageNumber() > 1 ? this.pageNumber() : null,
        pageSize: this.pageSize() !== 10 ? this.pageSize() : null
      }
    });

    // Nothing changed (e.g. the first load): no navigation.
    if (this.router.serializeUrl(urlTree) === this.router.url) {
      return;
    }

    // Replace, so every filter change does not add a step to "Back".
    this.router.navigateByUrl(urlTree, { replaceUrl: true });

  }


  private toPositiveNumber(value: string | null): number | undefined {

    const number = Number(value);

    return Number.isInteger(number) && number > 0 ? number : undefined;

  }


  loadStudents(): void {

    this.writeStateToUrl();

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


        error: (error: HttpErrorResponse) => {

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


  // Opens the student's page (/students/:id).
  // fromStudentsList tells that page that "Back" can return here
  // with the same search, filter and page.
  openStudentDetails(
    studentId: number
  ): void {

    this.router.navigate(['/students', studentId], {
      state: { fromStudentsList: true }
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

          this.actionResult.show(
            'error',
            this.apiMessageService.getMessage(response)
          );

          return;
        }


        this.loadStudents();

        this.actionResult.show(
          'success',
          this.apiMessageService.getMessage(response)
        );

      },


      error: (error: HttpErrorResponse) => {

        console.error(
          'Failed to update student status:',
          error
        );


        this.actionResult.show(
          'error',
          this.apiMessageService.getErrorMessage(error)
        );

      }

    });

}

  retry(): void {

    this.loadStudents();

  }

}