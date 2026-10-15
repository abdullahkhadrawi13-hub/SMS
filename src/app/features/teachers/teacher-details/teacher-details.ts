import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { TeachersService } from '../../../core/services/teachers';

import { ApiMessageService } from '../../../core/services/api-message';
import { getRoleTranslationKey } from '../../../core/models/user-role';
import { TeacherListDto } from '../../../core/models/teacher';


// Data passed when the details dialog is opened.
export interface TeacherDetailsDialogData {
  teacherId: number;
}


@Component({
  selector: 'app-teacher-details',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './teacher-details.html',
  styleUrl: './teacher-details.css',
})
export class TeacherDetails {

  // Service used to communicate with the Teachers API.
  private readonly teachersService = inject(TeachersService);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  // Used to stop pending requests when the dialog is closed.
  private readonly destroyRef = inject(DestroyRef);

  // Reference used to close the details dialog.
  private readonly dialogRef =
    inject(MatDialogRef<TeacherDetails>);

  // Id of the teacher to display.
  private readonly data =
    inject<TeacherDetailsDialogData>(MAT_DIALOG_DATA);


  // The teacher returned by the API.
  readonly teacher = signal<TeacherListDto | null>(null);

  // True while the teacher is being loaded.
  readonly isLoading = signal(false);

  // Error message (API message or translation key).
  readonly errorMessage = signal('');


  constructor() {
    this.loadTeacher();
  }


  // Loads the teacher (GET /api/teachers/{teacherId}).
  loadTeacher(): void {

    const teacherId = this.data.teacherId;

    if (!teacherId || teacherId <= 0) {
      this.errorMessage.set('TEACHERS.DETAILS.INVALID_ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.teachersService
      .getTeacher(teacherId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success || !response.data) {

            this.teacher.set(null);

            this.errorMessage.set(
              this.apiMessageService.getMessage(response) ||
              'TEACHERS.DETAILS.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          this.teacher.set(response.data);
          this.isLoading.set(false);
        },

        error: (error) => {

          console.error('Failed to load teacher:', error);

          this.teacher.set(null);

          // A missing teacher returns 404 with a normal body ("Teacher not found.").
          this.errorMessage.set(
            error.status === 404
              ? this.apiMessageService.getErrorMessage(error)
              : 'TEACHERS.DETAILS.LOAD_FAILED'
          );

          this.isLoading.set(false);
        },
      });
  }


  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherListDto): string {

    return document.documentElement.lang === 'ar'
      ? this.getArabicName(teacher) || this.getEnglishName(teacher)
      : this.getEnglishName(teacher) || this.getArabicName(teacher);
  }


  // Full four-part name in Arabic.
  getArabicName(teacher: TeacherListDto): string {

    return [
      teacher.firstNameAr,
      teacher.fatherNameAr,
      teacher.grandFatherNameAr,
      teacher.familyNameAr,
    ]
      .filter(Boolean)
      .join(' ');
  }


  // Full four-part name in English.
  getEnglishName(teacher: TeacherListDto): string {

    return [
      teacher.firstNameEn,
      teacher.fatherNameEn,
      teacher.grandFatherNameEn,
      teacher.familyNameEn,
    ]
      .filter(Boolean)
      .join(' ');
  }


  // The first letter of the first name and of the family name,
  // in the language of the page (the avatar of the profile header).
  // A zero-width non-joiner (\u200C) keeps two Arabic letters
  // apart, so they do not join into one word.
  getInitials(teacher: TeacherListDto): string {
    const isArabic = document.documentElement.lang === 'ar';

    const first = isArabic
      ? teacher.firstNameAr || teacher.firstNameEn
      : teacher.firstNameEn || teacher.firstNameAr;

    const family = isArabic
      ? teacher.familyNameAr || teacher.familyNameEn
      : teacher.familyNameEn || teacher.familyNameAr;

    return [first, family]
      .map(name => name?.trim().charAt(0) ?? '')
      .filter(Boolean)
      .join('\u200C')
      .toUpperCase();
  }

  // The shared function from user-role.ts, kept here under the same
  // name so the template can call it.
  readonly getRoleTranslationKey = getRoleTranslationKey;


  // Closes the dialog.
  close(): void {
    this.dialogRef.close();
  }


  // Loads the teacher again after a failed request.
  retry(): void {
    this.loadTeacher();
  }
}