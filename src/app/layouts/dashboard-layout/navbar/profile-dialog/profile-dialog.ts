import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { User } from '../../../../core/services/user';
import { Language } from '../../../../core/services/language';
import { Students } from '../../../../core/services/students';
import { Student, StudentStatus } from '../../../../core/models/student';
import { UserRole, getRoleTranslationKey } from '../../../../core/models/user-role';
import { StudentStatusBadge } from '../../../../shared/components/student-status/student-status';
import {
  getArabicName,
  getEnglishName,
  getFullName,
  getInitials
} from '../../../../shared/utils/person-name';
import { getRoleColor } from '../../../../shared/constants/role-colors';


// The value the dialog closes with when "Change" (password) is pressed.
// The navbar then opens the change-password dialog.
export const PROFILE_DIALOG_CHANGE_PASSWORD = 'change-password';


// The profile of the logged-in user (opened from the navbar menu).
//
// Read-only: the data comes from the login response kept by the User
// service, so the dialog sends no request. There is no endpoint for a user
// to edit their own name or phone (PUT /api/users/{userId} is Admin only),
// so the dialog only says to contact the administration.
//
// If the Admin edits the name after the user logged in, the old name
// stays until the next login (the same as the navbar).
//
// A student also gets "المعلومات الدراسية" (22 Nov 2026): the student
// number, the student status, the class and the section, from
// GET /api/students/me (PR #47). Only this section waits for the request;
// the rest shows at once, and a failed request shows a small message with
// "Try again" inside the section. A graduate sees "Graduated from …"
// instead of the class and the section.
//
// Navy & gold: the shared details dialog layout (styles.css: .fd, .dd-…),
// opened by the navbar with panelClass 'form-dialog' (full screen on the phone).
@Component({
  selector: 'app-profile-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
    StudentStatusBadge
  ],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.css',
  host: { class: 'fd' }
})
export class ProfileDialog {

  private readonly userService = inject(User);
  private readonly language = inject(Language);
  private readonly dialogRef = inject(MatDialogRef<ProfileDialog>);
  private readonly students = inject(Students);
  private readonly destroyRef = inject(DestroyRef);


  // The logged-in user.
  readonly user = this.userService.user;

  // A signal: the name and the avatar follow the language at once.
  private readonly isArabic = computed(() =>
    this.language.currentDirection() === 'rtl'
  );

  // Full four-part name in the language of the page (the profile card).
  readonly fullName = computed(() => {
    const user = this.user();
    return user ? getFullName(user, this.isArabic()) : '';
  });

  readonly arabicName = computed(() => {
    const user = this.user();
    return user ? getArabicName(user) : '';
  });

  readonly englishName = computed(() => {
    const user = this.user();
    return user ? getEnglishName(user) : '';
  });

  readonly initials = computed(() => {
    const user = this.user();
    return user ? getInitials(user, this.isArabic()) : '';
  });

  readonly roleKey = computed(() => {
    const user = this.user();
    return user ? getRoleTranslationKey(user.role) : '';
  });

  // One color per role (shared/constants/role-colors.ts).
  readonly roleColor = computed(() =>
    getRoleColor(this.user()?.role)
  );


  // ===== Study information (Student only) =====

  readonly isStudent = computed(() => this.user()?.role === UserRole.Student);

  // GET /api/students/me: null while loading or after an error.
  readonly studentInfo = signal<Student | null>(null);
  readonly studyLoading = signal(false);
  readonly studyError = signal(false);

  readonly isGraduated = computed(
    () => this.studentInfo()?.studentStatus === StudentStatus.Graduated
  );

  // The class and the section in the language of the page.
  readonly className = computed(() => {
    const info = this.studentInfo();
    return info ? (this.isArabic() ? info.classNameAr : info.classNameEn) : '';
  });

  readonly sectionName = computed(() => {
    const info = this.studentInfo();
    return info ? (this.isArabic() ? info.sectionAr : info.sectionEn) : '';
  });


  constructor() {
    if (this.isStudent()) {
      this.loadStudyInfo();
    }
  }


  // GET /api/students/me
  loadStudyInfo(): void {
    this.studyLoading.set(true);
    this.studyError.set(false);

    this.students
      .getMyProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.studyLoading.set(false);

          if (response.success && response.data) {
            this.studentInfo.set(response.data);
          } else {
            this.studyError.set(true);
          }
        },

        error: (error) => {
          console.error('Failed to load the study information:', error);
          this.studyLoading.set(false);
          this.studyError.set(true);
        },
      });
  }


  // Closes the profile; the navbar then opens the change-password dialog.
  changePassword(): void {
    this.dialogRef.close(PROFILE_DIALOG_CHANGE_PASSWORD);
  }

  close(): void {
    this.dialogRef.close();
  }
}
