import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Clipboard } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { UserAccountsService } from '../../../core/services/user-accounts';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { UserRole, getRoleTranslationKey } from '../../../core/models/user-role';
import {
  TEMP_PASSWORD_MAX_LENGTH,
  TEMP_PASSWORD_MIN_LENGTH,
  generateTempPassword
} from '../../utils/temp-password';


// The person whose password is reset.
// Student, TeacherListDto and ParentDto all have these fields,
// so the pages pass the table row as it is.
export interface ResetPasswordUser {
  userId: number;
  loginId: string;
  role: UserRole;

  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;
}

export interface ResetPasswordDialogData {
  user: ResetPasswordUser;

  // One more line on the person card, so the Admin is sure it is the
  // right person: the student number, the teacher number or the phone.
  detail?: {
    labelKey: string;
    value: string;
  };
}

// Returned only after a successful reset.
export interface ResetPasswordResult {
  reset: true;
}


// After 5 wrong Admin passwords (429) the button waits this long
// (the same 5 minutes as the login).
const LOCK_SECONDS = 5 * 60;

// How long the "Copied" check stays on a copy button.
const COPIED_MS = 1500;

type CopyTarget = 'loginId' | 'password' | 'both';


// "Reset password" (POST /api/users/{userId}/reset-password). Admin only.
// Opened from the ⋮ menu of the students, teachers and parents tables.
//
//   1. Form: a generated temporary password (editable) and the Admin's own
//      password to confirm.
//   2. Done: the temporary password with copy buttons, shown this one time
//      only (the backend does not return it and the frontend does not keep it).
//
// Errors stay inside the dialog:
//   - 400 about the Admin password → under that field (never a logout).
//   - 400 about the temporary password → under that field.
//   - 429 (5 wrong passwords) → a lock box with a countdown.
//   - anything else → above the buttons.
@Component({
  selector: 'app-reset-password-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslatePipe
  ],
  templateUrl: './reset-password-dialog.html',
  styleUrl: './reset-password-dialog.css',
})
export class ResetPasswordDialog {

  private readonly userAccountsService = inject(UserAccountsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly translate = inject(TranslateService);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef =
    inject(MatDialogRef<ResetPasswordDialog, ResetPasswordResult>);

  readonly data = inject<ResetPasswordDialogData>(MAT_DIALOG_DATA);

  readonly user = this.data.user;

  readonly roleKey = getRoleTranslationKey(this.user.role);

  readonly maxLength = TEMP_PASSWORD_MAX_LENGTH;


  // ===== The person =====

  // The four-part name in the UI language.
  readonly userName = computed(() => {

    const user = this.user;

    const parts = this.language.currentDirection() === 'rtl'
      ? [user.firstNameAr, user.fatherNameAr, user.grandFatherNameAr, user.familyNameAr]
      : [user.firstNameEn, user.fatherNameEn, user.grandFatherNameEn, user.familyNameEn];

    return parts.filter(part => !!part?.trim()).join(' ');
  });

  // First name only, for the "Give ... these details" line.
  readonly firstName = computed(() =>
    this.language.currentDirection() === 'rtl'
      ? this.user.firstNameAr
      : this.user.firstNameEn
  );


  // ===== Form =====

  readonly tempPassword = signal(generateTempPassword());
  readonly adminPassword = signal('');
  readonly showAdminPassword = signal(false);

  readonly isSubmitting = signal(false);

  // The temporary password's own rule (checked before sending).
  readonly tempPasswordTooShort = computed(() =>
    this.tempPassword().trim().length < TEMP_PASSWORD_MIN_LENGTH
  );

  // Errors from the backend.
  readonly tempPasswordError = signal('');
  readonly adminPasswordError = signal('');
  readonly formError = signal('');

  // ===== 429 lock =====

  readonly lockSecondsLeft = signal(0);

  readonly isLocked = computed(() => this.lockSecondsLeft() > 0);

  // m:ss
  readonly lockTimeText = computed(() => {
    const seconds = this.lockSecondsLeft();
    const rest = seconds % 60;
    return `${Math.floor(seconds / 60)}:${rest < 10 ? '0' : ''}${rest}`;
  });

  private lockTimer: ReturnType<typeof setInterval> | null = null;

  readonly canSubmit = computed(() =>
    !this.tempPasswordTooShort() &&
    this.adminPassword().length > 0 &&
    !this.isSubmitting() &&
    !this.isLocked()
  );


  // ===== Done =====

  // The password that was saved (what the Admin gives to the person).
  readonly savedPassword = signal<string | null>(null);

  readonly copied = signal<CopyTarget | null>(null);

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;


  private readonly adminPasswordInput =
    viewChild<ElementRef<HTMLInputElement>>('adminPasswordInput');


  constructor() {

    this.destroyRef.onDestroy(() => {
      this.stopLockTimer();

      if (this.copiedTimer) {
        clearTimeout(this.copiedTimer);
      }
    });
  }


  // ===== Inputs =====

  onTempPasswordInput(event: Event): void {
    this.tempPassword.set((event.target as HTMLInputElement).value);
    this.tempPasswordError.set('');
  }

  regenerate(): void {
    this.tempPassword.set(generateTempPassword());
    this.tempPasswordError.set('');
  }

  onAdminPasswordInput(event: Event): void {
    this.adminPassword.set((event.target as HTMLInputElement).value);
    this.adminPasswordError.set('');
  }

  toggleAdminPassword(): void {
    this.showAdminPassword.update(show => !show);
  }


  // ===== Submit =====

  submit(): void {

    if (!this.canSubmit()) {
      return;
    }

    const temporaryPassword = this.tempPassword().trim();

    this.isSubmitting.set(true);
    this.tempPasswordError.set('');
    this.adminPasswordError.set('');
    this.formError.set('');

    // No closing by Escape or a click outside while the request runs.
    this.dialogRef.disableClose = true;

    this.userAccountsService
      .resetPassword(this.user.userId, {
        adminPassword: this.adminPassword(),
        temporaryPassword
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isSubmitting.set(false);

          // The Admin password is never kept, whatever the result.
          this.adminPassword.set('');
          this.showAdminPassword.set(false);

          if (!response.success) {
            this.dialogRef.disableClose = false;
            this.formError.set(this.apiMessageService.getMessage(response));
            return;
          }

          this.savedPassword.set(temporaryPassword);

          // Closes again by a click outside or Escape, like every dialog.
          this.dialogRef.disableClose = false;
        },

        error: (error: HttpErrorResponse) => {

          this.isSubmitting.set(false);
          this.dialogRef.disableClose = false;

          this.adminPassword.set('');
          this.showAdminPassword.set(false);

          // 401: the interceptor already logged the Admin out.
          if (error.status === 401) {
            return;
          }

          const message = this.apiMessageService.getErrorMessage(error);

          // 429: 5 wrong passwords (the same counter as the login and the rollover).
          if (error.status === 429) {
            this.formError.set('');
            this.startLock();
            return;
          }

          if (error.status === 400) {
            this.showBadRequest(message, error.error?.messageEn ?? '');
            return;
          }

          console.error('Failed to reset the password:', error);

          this.formError.set(message);
        }
      });
  }


  // A 400: under the field it is about, or above the buttons.
  // messageEn is used to tell them apart because it does not change
  // with the UI language.
  private showBadRequest(message: string, messageEn: string): void {

    const text = messageEn.toLowerCase();

    if (text.includes('temporary password')) {
      this.tempPasswordError.set(message);
      return;
    }

    if (text.includes('admin password')) {
      this.adminPasswordError.set(message);

      // The field is empty again: the cursor goes back to it.
      setTimeout(() => this.adminPasswordInput()?.nativeElement.focus());
      return;
    }

    this.formError.set(message);
  }


  // ===== Lock (429) =====

  private startLock(): void {

    this.stopLockTimer();

    this.lockSecondsLeft.set(LOCK_SECONDS);

    this.lockTimer = setInterval(() => {

      const left = this.lockSecondsLeft() - 1;

      this.lockSecondsLeft.set(Math.max(left, 0));

      if (left <= 0) {
        this.stopLockTimer();
      }
    }, 1000);
  }

  private stopLockTimer(): void {

    if (this.lockTimer) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
    }
  }


  // ===== Copy =====

  copy(target: CopyTarget): void {

    const password = this.savedPassword() ?? '';

    const text =
      target === 'loginId' ? this.user.loginId :
      target === 'password' ? password :
      this.translate.instant('SHARED.RESET_PASSWORD.COPY_TEXT', {
        loginId: this.user.loginId,
        password
      });

    if (!this.clipboard.copy(text)) {
      return;
    }

    this.copied.set(target);

    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }

    this.copiedTimer = setTimeout(() => this.copied.set(null), COPIED_MS);
  }


  // ===== Close =====

  cancel(): void {
    this.dialogRef.close();
  }

  done(): void {
    this.dialogRef.close({ reset: true });
  }
}