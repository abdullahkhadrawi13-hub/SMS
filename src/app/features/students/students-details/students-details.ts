import { Component, DestroyRef, Inject, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';

import { TranslatePipe } from '@ngx-translate/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Students } from '../../../core/services/students';
import { ApiMessageService } from '../../../core/services/api-message';
import { AttendanceAccessService } from '../../../core/services/attendance-access';

import { AttendanceHistory } from '../../attendance/attendance-history/attendance-history';

import { Student } from '../student';

export interface StudentDetailsDialogData {
  studentId: number;
}

// The tabs of the dialog.
export type StudentDetailsTab = 'details' | 'attendance';

@Component({
  selector: 'app-student-details',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    TranslatePipe,
    AttendanceHistory
  ],
  templateUrl: './students-details.html',
  styleUrl: './students-details.css'
})
export class StudentsDetails {
  private readonly studentsService = inject(Students);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef =
    inject(MatDialogRef<StudentsDetails>);

  readonly direction = signal(document.documentElement.dir);
  readonly student = signal<Student | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // The "Attendance" tab (GET /api/attendance/by-student/{studentId})
  // is for Admin and AssistantPrincipal only. For the other roles
  // the tabs are not shown and the dialog looks as before.
  readonly canViewAttendance = this.attendanceAccess.fullAccess;

  readonly activeTab = signal<StudentDetailsTab>('details');

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
              this.apiMessageService.getMessage(response) ||
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