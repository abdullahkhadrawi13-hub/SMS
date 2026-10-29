import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/services/user';
import { LoginRequest } from '../../../core/models/login-request';
import { ApiMessageService } from '../../../core/services/api-message';

// بعد 5 كلمات مرور خاطئة يرد الـ API بـ 429 ويوقف الدخول 5 دقائق
// (لنفس اسم المستخدم ومن نفس الجهاز).
// إذا أضاف الباك اند لاحقًا الـ header المسمى Retry-After نستعمل قيمته بدل هذا الثابت.
const LOGIN_LOCK_MINUTES = 5;

// وقت أول رد 429 لكل اسم مستخدم: { "sara.k": 1793280000000 }
// محفوظ في sessionStorage حتى لا يرجع العدّاد للبداية مع كل محاولة أو تحديث للصفحة.
const LOCKS_STORAGE_KEY = 'loginLocks';

// نوع الخطأ المعروض أعلى النموذج
type LoginError = '' | 'invalid' | 'network' | 'server';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrls: [
    '../auth-tokens.css',
    '../auth-form.css',
    './login.css'
  ]
})
export class Login {

  private auth = inject(Auth);
  private user = inject(User);
  private router = inject(Router);
  private apiMessageService = inject(ApiMessageService);

  loginId = '';
  password = '';

  showPassword = signal(false);
  capsLockOn = signal(false);

  // true بعد أول ضغطة على "دخول": عندها فقط تظهر أخطاء الحقول الفارغة
  submitted = signal(false);

  isLoading = signal(false);

  error = signal<LoginError>('');

  // رسالة الباك اند للأخطاء غير المتوقعة (400 / 500)
  serverMessage = signal('');


  // ---------- القفل بعد محاولات كثيرة (429) ----------

  lockSecondsLeft = signal(0);

  isLocked = computed(() => this.lockSecondsLeft() > 0);

  // الوقت المتبقي بصيغة m:ss
  lockTimeText = computed(() => {
    const seconds = this.lockSecondsLeft();
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
  });

  private lockTimer: ReturnType<typeof setInterval> | null = null;

  // نسخة في الذاكرة إذا كان sessionStorage غير متاح (وضع خاص في بعض المتصفحات)
  private memoryLocks: Record<string, number> = {};


  constructor() {

    inject(DestroyRef).onDestroy(() => this.stopLockTimer());

  }


  togglePassword() {
    this.showPassword.update(value => !value);
  }


  // Caps Lock: نقرؤه من أي ضغطة مفتاح داخل حقل كلمة المرور
  checkCapsLock(event: KeyboardEvent) {
    this.capsLockOn.set(event.getModifierState?.('CapsLock') ?? false);
  }


  // القفل خاص بكل اسم مستخدم: إذا غيّر المستخدم الاسم نعيد الحساب
  onLoginIdChange(value: string) {

    this.loginId = value;

    this.refreshLock();

  }


  onSubmit() {

    this.submitted.set(true);
    this.error.set('');

    if (this.isLocked()) {
      return;
    }

    if (!this.loginId.trim() || !this.password) {
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
          this.error.set('invalid');
          return;
        }

        this.clearLock();

        const userData = response.data;

        this.user.setUser(userData);

        // أول تسجيل دخول: صفحة تغيير كلمة المرور تشرح السبب بنفسها
        // (لم نعد نحتاج رسالة منبثقة بعد الانتقال)
        if (userData.mustChangePassword) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },

      error: (error: HttpErrorResponse) => {

        this.isLoading.set(false);

        switch (error.status) {

          // اسم مستخدم أو كلمة مرور خاطئة أو حساب معطّل (الباك اند يعيد نفس الرد للثلاثة)
          case 401:
            this.error.set('invalid');
            break;

          // محاولات خاطئة كثيرة
          case 429:
            this.startLock();
            break;

          // لا يوجد رد من السيرفر (متوقف أو لا يوجد اتصال)
          case 0:
            this.error.set('network');
            break;

          default:
            console.error('Login error:', error);
            this.serverMessage.set(
              this.apiMessageService.getErrorMessage(error)
            );
            this.error.set('server');
        }
      }
    });
  }


  // ---------- دوال القفل ----------

  private lockKey(): string {
    return this.loginId.trim().toLowerCase();
  }

  // أول 429 لهذا الاسم: نحفظ وقته. إذا كان محفوظًا من قبل نُكمل منه.
  private startLock() {

    const key = this.lockKey();
    const locks = this.readLocks();

    if (!locks[key]) {
      locks[key] = Date.now();
      this.writeLocks(locks);
    }

    this.refreshLock();
  }

  // يحسب الثواني المتبقية للاسم المكتوب الآن، ويشغّل/يوقف العدّاد
  private refreshLock() {

    const key = this.lockKey();
    const locks = this.readLocks();
    const startedAt = locks[key];

    if (!key || !startedAt) {
      this.lockSecondsLeft.set(0);
      this.stopLockTimer();
      return;
    }

    const endsAt = startedAt + LOGIN_LOCK_MINUTES * 60 * 1000;
    const secondsLeft = Math.ceil((endsAt - Date.now()) / 1000);

    if (secondsLeft <= 0) {
      delete locks[key];
      this.writeLocks(locks);
      this.lockSecondsLeft.set(0);
      this.stopLockTimer();
      return;
    }

    this.lockSecondsLeft.set(secondsLeft);

    if (!this.lockTimer) {
      this.lockTimer = setInterval(() => this.refreshLock(), 1000);
    }
  }

  private clearLock() {

    const locks = this.readLocks();

    delete locks[this.lockKey()];

    this.writeLocks(locks);
    this.lockSecondsLeft.set(0);
    this.stopLockTimer();
  }

  private stopLockTimer() {

    if (this.lockTimer) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
    }
  }

  private readLocks(): Record<string, number> {

    try {
      const stored = sessionStorage.getItem(LOCKS_STORAGE_KEY);
      return stored ? JSON.parse(stored) as Record<string, number> : {};
    } catch {
      return { ...this.memoryLocks };
    }
  }

  private writeLocks(locks: Record<string, number>) {

    this.memoryLocks = { ...locks };

    try {
      if (Object.keys(locks).length === 0) {
        sessionStorage.removeItem(LOCKS_STORAGE_KEY);
      } else {
        sessionStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify(locks));
      }
    } catch {
      // sessionStorage غير متاح: يبقى العدّاد من الذاكرة حتى تحديث الصفحة
    }
  }
}
