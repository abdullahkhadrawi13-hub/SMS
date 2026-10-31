import { Component, computed, inject } from '@angular/core';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/services/user';
import { Language } from '../../../core/services/language';
import { getRoleTranslationKey } from '../../../core/models/user-role';
import { getInitials, getShortName } from '../../../shared/utils/person-name';
import { getRoleColor } from '../../../shared/constants/role-colors';

import { ChangePassword } from '../../../features/auth/change-password/change-password';
import { ProfileDialog, PROFILE_DIALOG_CHANGE_PASSWORD } from './profile-dialog/profile-dialog';

@Component({
  selector: 'app-navbar',
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    TranslatePipe,
    LanguageSwitcher
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly userService = inject(User);
  private readonly language = inject(Language);


  // The logged-in user (the login data kept by the User service).
  // null only for a moment while logging out.
  readonly user = this.userService.user;

  // currentDirection is a signal: everything below is calculated again
  // as soon as the language changes, so the name switches language at once.
  private readonly isArabic = computed(() =>
    this.language.currentDirection() === 'rtl'
  );

  // First name + family name: "محمد العمري" / "Mohammad Al-Omari".
  readonly shortName = computed(() => {
    const user = this.user();
    return user ? getShortName(user, this.isArabic()) : '';
  });

  // The letters of the round avatar: "مع" / "MA".
  readonly initials = computed(() => {
    const user = this.user();
    return user ? getInitials(user, this.isArabic()) : '';
  });

  // The translation key of the role (ROLES.ADMIN, ROLES.TEACHER, ...).
  readonly roleKey = computed(() => {
    const user = this.user();
    return user ? getRoleTranslationKey(user.role) : '';
  });

  // One color per role (shared/constants/role-colors.ts).
  readonly roleColor = computed(() =>
    getRoleColor(this.user()?.role)
  );


  logout(): void {
    // الانتقال إلى صفحة الدخول أولًا، ثم حذف رمز الدخول وبيانات المستخدم معًا.
    // بهذا الترتيب: إذا سألت الصفحة الحالية "المغادرة دون حفظ؟" (مثل كشف العلامات)
    // واختار المستخدم البقاء، يبقى مسجَّل الدخول ولا يضيع شيء.
    this.router.navigate(['/login']).then(navigated => {
      if (navigated) {
        this.auth.logout();
      }
    });
  }

  openProfile(): void {
    const dialogRef = this.dialog.open(ProfileDialog, {
      width: '600px',
      maxWidth: '95vw',
      autoFocus: false,
      ariaLabelledBy: 'profile-dialog-title'
    });

    // The "Change" button of the password closes the profile first,
    // then the change-password dialog opens (not one dialog over another).
    dialogRef.afterClosed().subscribe(result => {
      if (result === PROFILE_DIALOG_CHANGE_PASSWORD) {
        this.openChangePassword();
      }
    });
  }

  openChangePassword(): void {
    this.dialog.open(ChangePassword, {
      width: '500px',
      maxWidth: '95vw',
      autoFocus: false,
      panelClass: 'change-password-dialog'
    });
  }
}
