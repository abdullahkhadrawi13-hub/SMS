import { Component, computed, inject } from '@angular/core';

import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { User } from '../../../../core/services/user';
import { Language } from '../../../../core/services/language';
import { getRoleTranslationKey } from '../../../../core/models/user-role';
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
@Component({
  selector: 'app-profile-dialog',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.css',
})
export class ProfileDialog {

  private readonly userService = inject(User);
  private readonly language = inject(Language);
  private readonly dialogRef = inject(MatDialogRef<ProfileDialog>);


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


  // Closes the profile; the navbar then opens the change-password dialog.
  changePassword(): void {
    this.dialogRef.close(PROFILE_DIALOG_CHANGE_PASSWORD);
  }

  close(): void {
    this.dialogRef.close();
  }
}
