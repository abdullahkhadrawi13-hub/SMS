import { Component, inject } from '@angular/core';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';

import { ChangePassword } from '../../../features/auth/change-password/change-password';

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

  openChangePassword(): void {
    this.dialog.open(ChangePassword, {
      width: '500px',
      maxWidth: '95vw',
      autoFocus: false,
      panelClass: 'change-password-dialog'
    });
  }
}