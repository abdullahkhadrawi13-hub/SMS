import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolSettingsService } from '../../../../core/services/school-settings';
import { TeachersService } from '../../../../core/services/teachers';
import { ApiMessageService } from '../../../../core/services/api-message';
import { ActionResult } from '../../../../shared/services/action-result';

import { OfficerCurrentCard } from '../officer-current-card/officer-current-card';
import { OfficerSaveBar } from '../officer-save-bar/officer-save-bar';
import { OfficerTeacherList } from '../officer-teacher-list/officer-teacher-list';
import { OfficerTeacherSearch } from '../officer-teacher-search/officer-teacher-search';
import { TeacherListDto } from '../../../../core/models/teacher';


// Number of teachers shown in one page of the list.
const TEACHERS_PAGE_SIZE = 10;


@Component({
  selector: 'app-attendance-officer-page',
  imports: [
    RouterLink,

    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,

    OfficerCurrentCard,
    OfficerSaveBar,
    OfficerTeacherList,
    OfficerTeacherSearch,
  ],
  templateUrl: './attendance-officer-page.html',
  styleUrl: './attendance-officer-page.css',
})
export class AttendanceOfficerPage {

  // Service used to read and change the attendance officer.
  private readonly schoolSettingsService = inject(SchoolSettingsService);

  // Service used to load the teachers the Admin can choose from.
  private readonly teachersService = inject(TeachersService);

  // Used to stop pending requests when the page is destroyed.
  private readonly destroyRef = inject(DestroyRef);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  // Shows the success / error result dialog after saving.
  private readonly actionResult = inject(ActionResult);


  // ===== Current officer =====

  // The current attendance officer, or null when none is assigned.
  readonly officer = signal<TeacherListDto | null>(null);

  // Indicates whether the current officer is loading.
  readonly isLoading = signal(false);

  // Error message (API message or translation key) shown instead of the page.
  readonly errorMessage = signal('');


  // ===== Teachers list =====

  // The list is empty until the Admin searches:
  // no teachers are loaded when the page is opened.

  // Active teachers of the current page (searched in the backend).
  readonly teachers = signal<TeacherListDto[]>([]);

  // Total number of active teachers matching the current search.
  readonly totalCount = signal(0);

  // Current page number (1-based, like the API).
  readonly pageNumber = signal(1);

  // Number of teachers per page.
  readonly pageSize = TEACHERS_PAGE_SIZE;

  // The search text that was sent to the backend.
  // Empty = the Admin has not searched yet (or cleared the search).
  readonly search = signal('');

  // Indicates whether the teachers list is loading.
  readonly isListLoading = signal(false);

  // Error message (API message or translation key) shown instead of the list.
  readonly listErrorMessage = signal('');

  // The running teachers request.
  // It is cancelled when a new search or page is requested,
  // so an old answer never replaces a newer one.
  private teachersRequest?: Subscription;


  // ===== Selection =====

  // The teacher selected in the list (not saved yet).
  // The whole teacher is kept, not only his ID, so the selection
  // stays when the Admin searches again or opens another page.
  readonly selectedTeacher = signal<TeacherListDto | null>(null);

  // Indicates whether the new officer is currently being saved.
  readonly isSaving = signal(false);


  // ID of the current officer, used to mark his row in the list.
  readonly officerId = computed(
    () => this.officer()?.teacherId ?? null
  );

  // ID of the selected teacher, used to mark his row in the list.
  readonly selectedId = computed(
    () => this.selectedTeacher()?.teacherId ?? null
  );


  constructor() {

    // Load the officer when the page is opened.
    // The teachers are loaded only after the Admin searches.
    this.loadOfficer();
  }


  // Loads the ID of the current officer
  // (GET /api/schoolsettings/attendance-officer).
  loadOfficer(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.schoolSettingsService
      .getAttendanceOfficer()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.showOfficerError(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          // The API returns only the teacherId of the officer (or null).
          const officerId = response.data;

          if (officerId === null) {
            this.officer.set(null);
            this.isLoading.set(false);
            return;
          }

          // The name, number and phone are loaded by the ID.
          this.loadOfficerDetails(officerId);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load the attendance officer:', error);

          this.showOfficerError('ATTENDANCE_OFFICER.ERROR.LOAD_FAILED');
        },
      });
  }


  // Loads the details of the officer (GET /api/teachers/{teacherId}).
  private loadOfficerDetails(teacherId: number): void {

    this.teachersService
      .getTeacher(teacherId)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.showOfficerError(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.officer.set(response.data);
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load the attendance officer:', error);

          this.showOfficerError('ATTENDANCE_OFFICER.ERROR.LOAD_FAILED');
        },
      });
  }


  // Clears the officer and shows the error state of the page.
  private showOfficerError(message: string): void {

    this.officer.set(null);

    this.errorMessage.set(message);

    this.isLoading.set(false);
  }


  // Loads one page of the active teachers matching the current search
  // (GET /api/teachers?pageNumber=..&pageSize=..&search=..&isActive=true).
  loadTeachers(): void {

    // Cancel the previous request if it has not answered yet.
    this.teachersRequest?.unsubscribe();

    this.isListLoading.set(true);
    this.listErrorMessage.set('');

    this.teachersRequest = this.teachersService
      .getTeachers(
        this.pageNumber(),
        this.pageSize,
        this.search(),
        true
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.showListError(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.teachers.set(response.data.items);
          this.totalCount.set(response.data.totalCount);

          this.isListLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load teachers:', error);

          this.showListError('TEACHERS.ERROR.LOAD_FAILED');
        },
      });
  }


  // Clears the list and shows its error state.
  private showListError(message: string): void {

    this.teachers.set([]);
    this.totalCount.set(0);

    this.listErrorMessage.set(message);

    this.isListLoading.set(false);
  }


  // Runs when the Admin submits or clears the search field.
  onSearch(value: string): void {

    this.search.set(value);
    this.pageNumber.set(1);

    // Empty search: nothing is requested, the list goes back to empty.
    if (!value) {
      this.clearTeachers();
      return;
    }

    this.loadTeachers();
  }


  // Empties the list and stops the running request, if any.
  private clearTeachers(): void {

    this.teachersRequest?.unsubscribe();

    this.teachers.set([]);
    this.totalCount.set(0);

    this.listErrorMessage.set('');

    this.isListLoading.set(false);
  }


  // Runs when the Admin opens another page of the list.
  onPageChange(event: PageEvent): void {

    this.pageNumber.set(event.pageIndex + 1);

    this.loadTeachers();
  }


  // Runs when the Admin selects a teacher in the list.
  onSelectTeacher(teacher: TeacherListDto): void {
    this.selectedTeacher.set(teacher);
  }


  // Cancels the selection and hides the save bar.
  cancelSelection(): void {
    this.selectedTeacher.set(null);
  }


  // Saves the selected teacher as the attendance officer
  // (PUT /api/schoolsettings/attendance-officer/{teacherId}).
  save(): void {

    const teacher = this.selectedTeacher();

    if (!teacher || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    this.schoolSettingsService
      .setAttendanceOfficer(teacher.teacherId)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          this.isSaving.set(false);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          // The selected teacher is now the officer.
          this.officer.set(teacher);
          this.selectedTeacher.set(null);

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to set the attendance officer:', error);

          this.isSaving.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // Reloads the officer after he failed to load.
  retry(): void {
    this.loadOfficer();
  }
}