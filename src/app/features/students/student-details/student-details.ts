import {
  Component,
  DestroyRef,
  Inject,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Students } from '../../../core/services/students';
import { Student } from '../student';

export interface StudentDetailsDialogData {
  studentId: number;
}

@Component({
  selector: 'app-student-details',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './student-details.html',
  styleUrl: './student-details.css'
})
export class StudentDetails {
  private readonly studentsService = inject(Students);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef =
    inject(MatDialogRef<StudentDetails>);

  readonly direction = signal(document.documentElement.dir);
  readonly student = signal<Student | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: StudentDetailsDialogData
  ) {
    this.loadStudent();
  }

  loadStudent(): void {
    const studentId = this.data.studentId;

    if (!studentId || studentId <= 0) {
      this.errorMessage.set('STUDENTS_DETAILS.INVALID_ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.studentsService
      .getStudent(studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {

          if (!response.success || !response.data) {

            this.student.set(null);

            this.errorMessage.set(
              response.message ||
              'STUDENTS_DETAILS.LOAD_FAILED'
            );

            this.isLoading.set(false);

            return;
          }

          this.student.set(response.data);
          this.isLoading.set(false);
        },

        error: error => {

          console.error(
            'Failed to load student:',
            error
          );

          this.student.set(null);

          this.errorMessage.set(
            'STUDENTS_DETAILS.LOAD_FAILED'
          );

          this.isLoading.set(false);
        }
      });
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

  getRoleTranslationKey(role: number): string {
  switch (role) {
    case 0:
      return 'ROLES.ADMIN';
    case 1:
      return 'ROLES.ASSISTANT_PRINCIPAL';
    case 2:
      return 'ROLES.TEACHER';
    case 3:
      return 'ROLES.STUDENT';
    case 4:
      return 'ROLES.PARENT';
    default:
      return 'ROLES.UNKNOWN';
  }
}

  close(): void {
    this.dialogRef.close();
  }

  retry(): void {
    this.loadStudent();
  }
}