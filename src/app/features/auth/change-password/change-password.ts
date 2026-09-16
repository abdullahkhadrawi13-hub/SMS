import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/services/user';
import { ChangePasswordRequest } from '../../../core/models/change-password-request';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    MatIconModule,
    LanguageSwitcher
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css'
})
export class ChangePassword {

  private auth = inject(Auth);
  private user = inject(User);
  private router = inject(Router);

  passwordVisibility = [
    signal(false),
    signal(false),
    signal(false)
  ];

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  errorMessage = signal('');
  isLoading = signal(false);

  togglePassword(index: number) {
    this.passwordVisibility[index].update(value => !value);
  }

  onSubmit() {

    this.errorMessage.set('');

    if (
      !this.currentPassword ||
      !this.newPassword ||
      !this.confirmPassword
    ) {
      this.errorMessage.set('CHANGE_PASSWORD.REQUIRED');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('CHANGE_PASSWORD.PASSWORD_MISMATCH');
      return;
    }

    const data: ChangePasswordRequest = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    };

    this.isLoading.set(true);

    this.auth.changePassword(data).subscribe({
      next: (response) => {

        this.isLoading.set(false);

        if (!response.success || !response.data) {
          this.errorMessage.set('CHANGE_PASSWORD.ERROR');
          return;
        }

        this.user.setUser(response.data);

        this.router.navigate(['/dashboard']);
      },

      error: (error) => {

        this.isLoading.set(false);

        console.error('Change password error:', error);

        this.errorMessage.set('CHANGE_PASSWORD.ERROR');
      }
    });
  }
}