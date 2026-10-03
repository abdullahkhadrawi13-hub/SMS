import { Component, inject, signal } from '@angular/core';
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

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    MatIconModule,
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css'
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


  // true عند الفتح من الـ navbar (Dialog)، false عند الفتح كصفحة (أول تسجيل دخول)
  isDialog = !!this.dialogRef;

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

    this.passwordVisibility[index].update(
      value => !value
    );

  }


  // أخطاء الفورم (قبل إرسال الطلب) بترتيب الأولوية
  private validate(): string | null {

    // 1. تعبئة جميع الحقول
    if (
      !this.currentPassword ||
      !this.newPassword ||
      !this.confirmPassword
    ) {
      return 'CHANGE_PASSWORD.REQUIRED';
    }

    // 2. كلمة المرور الجديدة يجب ألا تكون نفس الحالية
    if (this.currentPassword === this.newPassword) {
      return 'CHANGE_PASSWORD.SAME_PASSWORD';
    }

    // 3. طول كلمة المرور الجديدة 8 أو أكثر
    if (this.newPassword.length < MIN_PASSWORD_LENGTH) {
      return 'CHANGE_PASSWORD.MIN_LENGTH';
    }

    // 4. تطابق New Password مع Confirm Password
    if (this.newPassword !== this.confirmPassword) {
      return 'CHANGE_PASSWORD.PASSWORD_MISMATCH';
    }

    return null;
  }


  onSubmit() {

    const validationError = this.validate();

    this.errorMessage.set(validationError ?? '');

    if (validationError) {
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

          this.actionResult.error(
            this.apiMessageService.getMessage(response)
          );

          return;

        }


        this.user.setUser(response.data);


        // إذا كان المكون مفتوحًا داخل Dialog
        if (this.dialogRef) {

          this.dialogRef.close(true);

        } else {

          // إذا كان المكون مفتوحًا كصفحة
          this.router.navigate(['/dashboard']);

        }


        this.actionResult.success(
          this.apiMessageService.getMessage(response)
        );

      },


      error: error => {
        console.error('Change password error:', error);

        this.isLoading.set(false);

        this.actionResult.error(
          this.apiMessageService.getErrorMessage(error)
        );
      }

    });

  }

}