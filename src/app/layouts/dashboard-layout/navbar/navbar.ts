import { Component, inject } from '@angular/core';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { Router } from '@angular/router';
import { User } from '../../../core/services/user';

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

  private readonly userService = inject(User);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  logout(): void {
    this.userService.clearUser();
    this.router.navigate(['/login']);
  }

  openChangePassword(): void {
    this.dialog.open(ChangePassword, {
      width: '500px',
      maxWidth: '95vw',
      autoFocus: false
    });
  }
}
