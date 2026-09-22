import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';


import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/services/user';
import { LoginRequest } from '../../../core/models/login-request';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  private auth = inject(Auth);
  private user = inject(User);
  private router = inject(Router);

  showPassword = signal(false);

  loginId = '';
  password = '';

  errorMessage = signal('');
  isLoading = signal(false);

  togglePassword() {
    this.showPassword.update(value => !value);
  }

  onSubmit() {

    this.errorMessage.set('');

    if (!this.loginId || !this.password) {
      this.errorMessage.set('LOGIN.REQUIRED');
      return;
    }

    const data: LoginRequest = {
      loginId: this.loginId,
      password: this.password
    };

    this.isLoading.set(true);

    this.auth.login(data).subscribe({
      next: (response) => {

        this.isLoading.set(false);

        if (!response.success || !response.data) {
          this.errorMessage.set('LOGIN.ERROR');
          return;
        }

        const userData = response.data;

        this.user.setUser(userData);

        if (userData.mustChangePassword) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },

      error: (error) => {

        this.isLoading.set(false);

        console.error('Login error:', error);

        this.errorMessage.set('LOGIN.ERROR');
      }
    });
  }
}