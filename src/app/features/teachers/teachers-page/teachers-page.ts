import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslatePipe } from '@ngx-translate/core';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PageEvent } from '@angular/material/paginator';

import {
  TeacherListDto,
  TeachersService,
} from '../../../core/services/teachers';

import { ApiMessageService } from '../../../core/services/api-message';
import { User } from '../../../core/services/user';
import { ActionResult } from '../../../shared/services/action-result';

import { TeacherHeader } from '../teacher-header/teacher-header';
import { TeacherSearch } from '../teacher-search/teacher-search';
import {
  TeacherFilter,
  TeacherFilterValues,
} from '../teacher-filter/teacher-filter';
import { TeacherTable } from '../teacher-table/teacher-table';
import { TeacherForm } from '../teacher-form/teacher-form';
import { TeacherDetails } from '../teacher-details/teacher-details';


@Component({
  selector: 'app-teachers-page',
  imports: [
    TeacherHeader,
    TeacherSearch,
    TeacherTable,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslatePipe,
  ],
  templateUrl: './teachers-page.html',
  styleUrl: './teachers-page.css',
})
export class TeachersPage {

  // Service used to communicate with the Teachers API.
  private readonly teachersService = inject(TeachersService);

  // Used to stop pending requests when the page is destroyed.
  private readonly destroyRef = inject(DestroyRef);

  // Reference used to open teacher dialogs (form, details, filter).
  private readonly dialog = inject(MatDialog);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  // Shows the success / error result dialog after an action.
  private readonly actionResult = inject(ActionResult);

  // Current logged-in user, used to know the role.
  private readonly user = inject(User);


  // Only the Admin (role 0) can add, edit, activate or deactivate teachers.
  // The Assistant Principal (role 1) can only read.
  readonly canManage = computed(
    () => this.user.user()?.role === 0
  );


  // Teachers of the current page.
  readonly teachers = signal<TeacherListDto[]>([]);

  // Total number of teachers matching the current search and filter.
  readonly totalCount = signal(0);

  // Current page number (1-based, like the API).
  readonly pageNumber = signal(1);

  // Current number of rows displayed per page.
  readonly pageSize = signal(10);

  // Current search text.
  readonly search = signal('');

  // Stores the currently selected teacher status filter.
  readonly statusFilter = signal<boolean | undefined>(undefined);

  // Indicates whether the list is currently loading.
  readonly isLoading = signal(false);

  // Error message (API message or translation key) shown instead of the table.
  readonly errorMessage = signal('');


  constructor() {

    // Load the first page when the page is opened.
    this.loadTeachers();
  }


  // Loads teachers using the current page, search and filter values.
  loadTeachers(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.teachersService
      .getTeachers(
        this.pageNumber(),
        this.pageSize(),
        this.search(),
        this.statusFilter()
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.teachers.set([]);
            this.totalCount.set(0);

            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );

            this.isLoading.set(false);
            return;
          }

          const data = response.data;

          // If the current page came back empty and it is not the first page
          // (for example after filtering), go one page back and reload.
          if (data.items.length === 0 && data.pageNumber > 1) {
            this.pageNumber.set(data.pageNumber - 1);
            this.loadTeachers();
            return;
          }

          this.teachers.set(data.items);
          this.totalCount.set(data.totalCount);
          this.pageNumber.set(data.pageNumber);
          this.pageSize.set(data.pageSize);

          this.isLoading.set(false);
        },

        error: (error) => {

          console.error('Failed to load teachers:', error);

          this.teachers.set([]);
          this.totalCount.set(0);

          this.errorMessage.set('TEACHERS.ERROR.LOAD_FAILED');

          this.isLoading.set(false);
        },
      });
  }


  // Runs when the user submits or clears the search field.
  onSearch(value: string): void {

    this.search.set(value);
    this.pageNumber.set(1);

    this.loadTeachers();
  }


  // Handles paginator changes and reloads the requested page.
  onPageChange(event: PageEvent): void {

    this.pageNumber.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);

    this.loadTeachers();
  }


  // Opens the teacher filter dialog and applies the selected values.
  openFilter(): void {

    const current: TeacherFilterValues = {
      isActive: this.statusFilter() ?? null,
    };

    this.dialog
      .open(TeacherFilter, {
        width: '420px',
        data: current,
      })
      .afterClosed()
      .subscribe((result?: TeacherFilterValues) => {

        // Ignore the result when the dialog is cancelled or closed.
        if (!result) {
          return;
        }

        this.statusFilter.set(
          result.isActive ?? undefined
        );

        this.pageNumber.set(1);

        this.loadTeachers();
      });
  }


  // Opens the teacher details dialog (GET /api/teachers/{teacherId}).
  openTeacherDetails(teacherId: number): void {

    this.dialog.open(TeacherDetails, {
      width: '850px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { teacherId },
    });
  }


  // Opens the teacher form in add mode (POST /api/teachers).
  openAddTeacher(): void {

    this.dialog
      .open(TeacherForm, {
        width: '850px',
        maxWidth: '95vw',
        maxHeight: '90vh',
      })
      .afterClosed()
      .subscribe((result) => {

        if (result?.success) {
          this.loadTeachers();
        }
      });
  }


  // Opens the teacher form in edit mode (PUT /api/teachers/{teacherId}).
  openEditTeacher(teacherId: number): void {

    this.dialog
      .open(TeacherForm, {
        width: '850px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: { teacherId },
      })
      .afterClosed()
      .subscribe((result) => {

        if (result?.success) {
          this.loadTeachers();
        }
      });
  }


  // Activates or deactivates a teacher (PATCH /api/teachers/{teacherId}/status).
  toggleTeacherStatus(teacher: TeacherListDto): void {

    this.teachersService
      .updateTeacherStatus(
        teacher.teacherId,
        !teacher.isActive
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.actionResult.error(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.loadTeachers();

          this.actionResult.success(
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error) => {

          console.error('Failed to update teacher status:', error);

          this.actionResult.error(
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // Reloads the list after a failed request.
  retry(): void {
    this.loadTeachers();
  }
}
