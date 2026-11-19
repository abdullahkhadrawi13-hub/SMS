import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { filter, map, Observable, of, tap } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/services/user';
import { Language } from '../../../core/services/language';
import { ChangePasswordRequest } from '../../../core/models/change-password-request';
import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';
import {
  ConfirmDialog,
  ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog';

// نفس شروط الـ API (القسم 3): من 8 إلى 100 حرف
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 100;

// حالة كل شرط تحت الحقل: '' لم يُكتب شيء بعد، 'ok' متحقق، 'no' غير متحقق
type RuleState = '' | 'ok' | 'no';

// الحقول بترتيب ظهورها (لنقل المؤشر إلى أول حقل خاطئ في النافذة)
type FieldName = 'current' | 'new' | 'confirm';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './change-password.html',
  styleUrls: [
    '../auth-form.css',
    './change-password.css'
  ],
  host: {
    // النافذة فقط: الشكل المشترك للنوافذ في styles.css (.fd, .fd-head, .fd-body…)
    '[class.fd]': '!isFirstLogin'
  }
})
export class ChangePassword {

  private auth = inject(Auth);
  private user = inject(User);
  private router = inject(Router);
  private apiMessageService = inject(ApiMessageService);
  private actionResult = inject(ActionResult);
  private dialog = inject(MatDialog);
  private language = inject(Language);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);

  private dialogRef = inject(
    MatDialogRef<ChangePassword>,
    { optional: true }
  );


  // المكوّن يفتح من مكانين:
  // - صفحة /change-password: أول تسجيل دخول بكلمة مرور مؤقتة (firstLoginGuard يضمن ذلك)
  //   شكلها شكل صفحات الدخول (auth-form.css)، ولم يتغيّر
  // - نافذة من الـ navbar: تغيير عادي لكلمة المرور، بشكل النوافذ المشترك
  //   (رأس فيه ✕، حقول .field، تذييل فيه "إلغاء" ثم الزر الأساسي)،
  //   وتُفتح بـ panelClass 'form-dialog' (تملأ شاشة الهاتف)
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

  // سؤال "تجاهل التغييرات؟" مفتوح (حتى لا يفتح Esc ثانٍ سؤالًا آخر)
  private isConfirmingClose = false;


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

  // الحقول التي ما زالت خاطئة، بترتيب ظهورها
  private invalidFields = computed<FieldName[]>(() => {
    const fields: FieldName[] = [];

    if (!this.currentPassword()) fields.push('current');
    if (this.lengthRule() !== 'ok' || this.differentRule() !== 'ok') fields.push('new');
    if (this.matchRule() !== 'ok') fields.push('confirm');

    return fields;
  });

  // "N حقول تحتاج تصحيحًا" جنب الأزرار في النافذة، بعد ضغط الزر
  invalidCount = computed(() =>
    this.submitted() ? this.invalidFields().length : 0
  );

  private isValid = computed(() => this.invalidFields().length === 0);

  // تغيّر شيء في النافذة؟ (لسؤال "تجاهل التغييرات؟" قبل الإغلاق)
  private isDirty = computed(() =>
    !!this.currentPassword() || !!this.newPassword() || !!this.confirmPassword()
  );


  constructor() {

    if (this.dialogRef) {
      this.setUpClosing(this.dialogRef);
    }

  }


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


  errorsCountKey(count: number): string {

    if (count === 1) return 'CHANGE_PASSWORD.ERRORS_COUNT.ONE';
    if (count === 2) return 'CHANGE_PASSWORD.ERRORS_COUNT.TWO';
    return 'CHANGE_PASSWORD.ERRORS_COUNT.FEW';

  }


  // أول دخول: إذا دخل بالحساب الخطأ يستطيع الخروج (لا يوجد مكان آخر يذهب إليه)
  logout() {

    this.router.navigate(['/login']).then(navigated => {
      if (navigated) {
        this.auth.logout();
      }
    });

  }


  // ---------- إغلاق النافذة ----------

  // النقر خارج النافذة وEsc لا يغلقانها مباشرة:
  // يمرّان بـ requestClose() التي تسأل أولًا إذا كُتب شيء
  private setUpClosing(dialogRef: MatDialogRef<ChangePassword>) {

    dialogRef.disableClose = true;

    dialogRef
      .backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.requestClose());

    dialogRef
      .keydownEvents()
      .pipe(
        filter(event => event.key === 'Escape'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        event.preventDefault();
        this.requestClose();
      });

  }

  // ✕ و"إلغاء" والنقر خارج النافذة وEsc
  requestClose() {

    this.confirmDiscard().subscribe(canClose => {
      if (canClose) {
        this.dialogRef?.close();
      }
    });

  }

  // هل تُغلق النافذة الآن؟
  //   - نعم مباشرة إذا لم يُكتب شيء
  //   - وإلا تسأل "تجاهل التغييرات؟": نعم عند "تجاهل التغييرات"
  //   - لا أثناء الحفظ، أو إذا كان السؤال مفتوحًا أصلًا
  private confirmDiscard(): Observable<boolean> {

    if (this.isLoading() || this.isConfirmingClose) {
      return of(false);
    }

    if (!this.isDirty()) {
      return of(true);
    }

    this.isConfirmingClose = true;

    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data: {
          icon: 'edit_note',
          titleKey: 'CHANGE_PASSWORD.DISCARD.TITLE',
          messageKey: 'CHANGE_PASSWORD.DISCARD.MESSAGE',
          confirmKey: 'CHANGE_PASSWORD.DISCARD.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .pipe(
        tap(() => (this.isConfirmingClose = false)),
        map(confirmed => confirmed === true)
      );

  }


  // النافذة: المؤشر ينتقل إلى أول حقل خاطئ، فيبدأ المستخدم منه
  private focusFirstInvalid() {

    const name = this.invalidFields()[0];

    if (!name) {
      return;
    }

    const element = this.host.nativeElement.querySelector<HTMLElement>(
      `[data-field="${name}"]`
    );

    element?.focus();
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  }


  onSubmit() {

    // الزر يبقى بلونه أثناء الحفظ، فالحماية من الضغط المزدوج هنا
    if (this.isLoading()) {
      return;
    }

    this.submitted.set(true);
    this.serverError.set('');

    if (!this.isValid()) {

      if (!this.isFirstLogin) {
        this.focusFirstInvalid();
      }

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
