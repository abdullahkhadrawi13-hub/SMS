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
import { Permissions } from '../../../core/services/permissions';
import { getRoleTranslationKey } from '../../../core/models/user-role';

import { AttendanceHistory } from '../../attendance/attendance-history/attendance-history';

import { Student } from '../../../core/models/student';

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
  private readonly permissions = inject(Permissions);
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

  // The phone number and the "Account Information" section
  // are for Admin and AssistantPrincipal only (hidden from a teacher).
  readonly canViewPrivateInfo = this.permissions.canViewStudentPrivateInfo;

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

  // The name in the language of the page (used in the profile header).
  getStudentName(student: Student): string {
    return document.documentElement.lang === 'ar'
      ? this.getStudentNameAr(student) || this.getStudentNameEn(student)
      : this.getStudentNameEn(student) || this.getStudentNameAr(student);
  }

  getStudentNameAr(student: Student): string {
    return [
      student.firstNameAr,
      student.fatherNameAr,
      student.grandFatherNameAr,
      student.familyNameAr
    ]
      .filter(Boolean)
      .join(' ');
  }

  getStudentNameEn(student: Student): string {
    return [
      student.firstNameEn,
      student.fatherNameEn,
      student.grandFatherNameEn,
      student.familyNameEn
    ]
      .filter(Boolean)
      .join(' ');
  }

  // The first letter of the first name and of the family name,
  // in the language of the page (the avatar of the profile header).
  // A zero-width non-joiner (\u200C) keeps two Arabic letters
  // apart, so they do not join into one word.
  getInitials(student: Student): string {
    const isArabic = document.documentElement.lang === 'ar';

    const first = isArabic
      ? student.firstNameAr || student.firstNameEn
      : student.firstNameEn || student.firstNameAr;

    const family = isArabic
      ? student.familyNameAr || student.familyNameEn
      : student.familyNameEn || student.familyNameAr;

    return [first, family]
      .map(name => name?.trim().charAt(0) ?? '')
      .filter(Boolean)
      .join('\u200C')
      .toUpperCase();
  }

  // The class name comes with the student (classNameAr / classNameEn).
  // Falls back to the id if the names are missing.
  getClassName(student: Student): string {
    const name = document.documentElement.lang === 'ar'
      ? student.classNameAr || student.classNameEn
      : student.classNameEn || student.classNameAr;

    return name || String(student.classId ?? '-');
  }

  // The section name comes with the student (sectionAr / sectionEn).
  // Falls back to the id if the names are missing.
  getSectionName(student: Student): string {
    const name = document.documentElement.lang === 'ar'
      ? student.sectionAr || student.sectionEn
      : student.sectionEn || student.sectionAr;

    return name || String(student.sectionId ?? '-');
  }

  // The shared function from user-role.ts, kept here under the same
  // name so the template can call it.
  readonly getRoleTranslationKey = getRoleTranslationKey;

  close(): void {
    this.dialogRef.close();
  }

  retry(): void {
    this.loadStudent();
  }
}