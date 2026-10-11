import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { forkJoin } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolSettingsService } from '../../../../core/services/school-settings';
import {
  TeacherListDto,
  TeachersService,
} from '../../../../core/services/teachers';
import { ApiMessageService } from '../../../../core/services/api-message';
import { ActionResult } from '../../../../shared/services/action-result';

import { OfficerCurrentCard } from '../officer-current-card/officer-current-card';
import { OfficerTeacherList } from '../officer-teacher-list/officer-teacher-list';
import { getTeacherName } from '../teacher-name';


// The API reference asks for the active teachers in one request:
// GET /api/teachers?isActive=true&pageSize=100
const TEACHERS_PAGE_SIZE = 100;


@Component({
  selector: 'app-attendance-officer-page',
  imports: [
    RouterLink,

    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,

    OfficerCurrentCard,
    OfficerTeacherList,
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


  // Active teachers the Admin can choose from.
  readonly teachers = signal<TeacherListDto[]>([]);

  // The current attendance officer, or null when none is assigned.
  readonly officer = signal<TeacherListDto | null>(null);

  // ID of the teacher selected in the list (not saved yet).
  readonly selectedId = signal<number | null>(null);

  // Indicates whether the page data is currently loading.
  readonly isLoading = signal(false);

  // Indicates whether the new officer is currently being saved.
  readonly isSaving = signal(false);

  // Error message (API message or translation key) shown instead of the page.
  readonly errorMessage = signal('');


  // ID of the current officer, used to mark his row in the list.
  readonly officerId = computed(
    () => this.officer()?.teacherId ?? null
  );

  // The teacher selected in the list, or null when nothing is selected.
  readonly selectedTeacher = computed(
    () => this.teachers().find(
      teacher => teacher.teacherId === this.selectedId()
    ) ?? null
  );


  constructor() {

    // Load the officer and the teachers when the page is opened.
    this.loadData();
  }


  // Loads the current officer and the active teachers together.
  loadData(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      officer: this.schoolSettingsService.getAttendanceOfficer(),
      teachers: this.teachersService.getTeachers(
        1,
        TEACHERS_PAGE_SIZE,
        undefined,
        true
      ),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ officer, teachers }) => {

          if (!officer.success) {
            this.showLoadError(
              this.apiMessageService.getMessage(officer)
            );
            return;
          }

          if (!teachers.success) {
            this.showLoadError(
              this.apiMessageService.getMessage(teachers)
            );
            return;
          }

          this.teachers.set(teachers.data.items);
          this.selectedId.set(null);

          // The API returns only the teacherId of the officer (or null).
          const officerId = officer.data;

          if (officerId === null) {
            this.officer.set(null);
            this.isLoading.set(false);
            return;
          }

          // The name and number are taken from the loaded teachers.
          const officerTeacher = teachers.data.items.find(
            teacher => teacher.teacherId === officerId
          );

          if (officerTeacher) {
            this.officer.set(officerTeacher);
            this.isLoading.set(false);
            return;
          }

          // The officer is not in the first 100 teachers:
          // load him alone.
          this.loadOfficerDetails(officerId);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load attendance officer data:', error);

          this.showLoadError('ATTENDANCE_OFFICER.ERROR.LOAD_FAILED');
        },
      });
  }


  // Loads one teacher (GET /api/teachers/{teacherId}).
  // Used only when the officer is not in the loaded teachers.
  private loadOfficerDetails(teacherId: number): void {

    this.teachersService
      .getTeacher(teacherId)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.showLoadError(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.officer.set(response.data);
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load the attendance officer:', error);

          this.showLoadError('ATTENDANCE_OFFICER.ERROR.LOAD_FAILED');
        },
      });
  }


  // Clears the page data and shows the error state.
  private showLoadError(message: string): void {

    this.teachers.set([]);
    this.officer.set(null);
    this.selectedId.set(null);

    this.errorMessage.set(message);

    this.isLoading.set(false);
  }


  // Runs when the Admin selects a teacher in the list.
  onSelectTeacher(teacherId: number): void {
    this.selectedId.set(teacherId);
  }


  // Cancels the selection and hides the save bar.
  cancelSelection(): void {
    this.selectedId.set(null);
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
          this.selectedId.set(null);

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


  // Reloads the page data after a failed request.
  retry(): void {
    this.loadData();
  }


  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherListDto): string {
    return getTeacherName(teacher);
  }
}