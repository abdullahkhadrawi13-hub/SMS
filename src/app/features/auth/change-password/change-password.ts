import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/services/user';
import { ChangePasswordRequest } from '../../../core/models/change-password-request';
import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';

// نفس شروط الـ API (القسم 3): من 8 إلى 100 حرف
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 100;

// حالة كل شرط تحت الحقل: '' لم يُكتب شيء بعد، 'ok' متحقق، 'no' غير متحقق
type RuleState = '' | 'ok' | 'no';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    MatIconModule,
  ],
  templateUrl: './change-password.html',
  styleUrls: [
    '../auth-tokens.css',
    '../auth-form.css',
    './change-password.css'
  ]
})
export class ChangePassword {

  private auth = inject(Auth);
  private user = inject(User);
  private router = inject(Router);
  private apiMessageService = inject(ApiMessageService);
  private actionResult = inject(ActionResult);

  private dialogRef = inject(
    MatDialogRef<ChangePassword>,
    { optional: true }
  );


  // المكوّن يفتح من مكانين:
  // - صفحة /change-password: أول تسجيل دخول بكلمة مرور مؤقتة (firstLoginGuard يضمن ذلك)
  // - Dialog من الـ navbar: تغيير عادي لكلمة المرور
  isFirstLogin = !this.dialogRef;

  // اسم المستخدم لسطر "داخل باسم" (أول دخول فقط)
  loginId = this.user.getUser()?.loginId ?? '';

  passwordVisibility = [
    signal(false),
    signal(false),
    signal(false)
  ];

  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  // true بعد أول ضغطة على زر الحفظ: عندها تظهر الأخطاء للحقول الفارغة أيضًا
  submitted = signal(false);

  isLoading = signal(false);

  // رسالة الباك اند عند الرفض (مثلًا كلمة المرور الحالية خاطئة)
  serverError = signal('');


  // ---------- الشروط (تتحقق أثناء الكتابة) ----------

  currentMissing = computed(() =>
    this.submitted() && !this.currentPassword()
  );

  lengthRule = computed<RuleState>(() => {
    const value = this.newPassword();
    if (!value) return this.submitted() ? 'no' : '';
    return value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH ? 'ok' : 'no';
  });

  differentRule = computed<RuleState>(() => {
    const value = this.newPassword();
    if (!value) return this.submitted() ? 'no' : '';
    return value !== this.currentPassword() ? 'ok' : 'no';
  });

  matchRule = computed<RuleState>(() => {
    const value = this.confirmPassword();
    if (!value) return this.submitted() ? 'no' : '';
    return value === this.newPassword() ? 'ok' : 'no';
  });

  newPasswordInvalid = computed(() =>
    this.lengthRule() === 'no' || this.differentRule() === 'no'
  );

  private isValid = computed(() =>
    !!this.currentPassword() &&
    this.lengthRule() === 'ok' &&
    this.differentRule() === 'ok' &&
    this.matchRule() === 'ok'
  );


  togglePassword(index: number) {

    this.passwordVisibility[index].update(
      value => !value
    );

  }


  ruleIcon(state: RuleState): string {

    if (state === 'ok') return 'check_circle';
    if (state === 'no') return 'cancel';
    return 'radio_button_unchecked';

  }


  // أول دخول: إذا دخل بالحساب الخطأ يستطيع الخروج (لا يوجد مكان آخر يذهب إليه)
  logout() {

    this.router.navigate(['/login']).then(navigated => {
      if (navigated) {
        this.auth.logout();
      }
    });

  }


  onSubmit() {

    this.submitted.set(true);
    this.serverError.set('');

    if (!this.isValid()) {
      return;
    }


    const data: ChangePasswordRequest = {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
      confirmPassword: this.confirmPassword()
    };


    this.isLoading.set(true);


    this.auth.changePassword(data).subscribe({

      next: (response) => {

        this.isLoading.set(false);


        if (!response.success || !response.data) {

          this.serverError.set(
            this.apiMessageService.getMessage(response)
          );

          return;

        }


        // mustChangePassword يصبح false، فيسمح mustChangePasswordGuard بدخول لوحة التحكم
        this.user.setUser(response.data);


        if (this.dialogRef) {

          this.dialogRef.close(true);

        } else {

          this.router.navigate(['/dashboard']);

        }


        this.actionResult.show(
          'success',
          this.apiMessageService.getMessage(response)
        );

      },


      error: (error: HttpErrorResponse) => {
        console.error('Change password error:', error);

        this.isLoading.set(false);

        this.serverError.set(
          this.apiMessageService.getErrorMessage(error)
        );
      }

    });

  }

}
