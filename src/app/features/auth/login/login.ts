import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';


import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/services/user';
import { LoginRequest } from '../../../core/models/login-request';
import { ActionResult } from '../../../shared/services/action-result';

// المدة (بالميلي ثانية) بين الوصول لصفحة تغيير كلمة المرور وظهور الرسالة
const FIRST_LOGIN_NOTICE_DELAY_MS = 300;

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
  private translate = inject(TranslateService);
  private actionResult = inject(ActionResult);

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

          // أول تسجيل دخول: ننتقل لصفحة تغيير كلمة المرور
          // ثم بعد مدة قصيرة جدًا نعرض رسالة توضح سبب الانتقال
          this.router.navigate(['/change-password']).then(navigated => {

            if (!navigated) {
              return;
            }

            setTimeout(() => {
              this.actionResult.info(
                this.translate.instant('LOGIN.FIRST_LOGIN_NOTICE')
              );
            }, FIRST_LOGIN_NOTICE_DELAY_MS);

          });

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