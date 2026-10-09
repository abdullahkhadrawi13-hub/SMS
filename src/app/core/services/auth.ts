import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { LoginRequest } from '../models/login-request';
import { LoginResponse } from '../models/login-response';
import { ChangePasswordRequest } from '../models/change-password-request';
import { User } from './user';

// مفتاح تخزين رمز الدخول (JWT).
// هذه الخدمة هي المكان الوحيد الذي يحفظ الرمز أو يقرؤه أو يحذفه.
// باقي الملفات (authGuard, authInterceptor, Navbar) تسأل هذه الخدمة فقط.
const TOKEN_KEY = 'token';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private http = inject(HttpClient);
  private user = inject(User);

  private readonly baseUrl = 'http://localhost:5253/api/Auth';

  // الرمز محفوظ في sessionStorage (نفس مكان بيانات المستخدم في User):
  // تحديث الصفحة يحافظ على الجلسة، وإغلاق التبويب ينهيها.
  private readonly token = signal<string | null>(
    sessionStorage.getItem(TOKEN_KEY)
  );


  constructor() {

    // حذف الرمز القديم الذي كانت النسخ السابقة تحفظه في localStorage
    localStorage.removeItem(TOKEN_KEY);

    // جلسة ناقصة (رمز بدون بيانات مستخدم أو العكس): تُحذف كاملة
    if (!this.isLoggedIn()) {
      this.logout();
    }

  }


  login(data: LoginRequest): Observable<ApiResponse<LoginResponse>> {

    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.baseUrl}/Login`,
        data
      )
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setToken(response.data.token);
          }
        })
      );
  }

  changePassword(
    data: ChangePasswordRequest
  ): Observable<ApiResponse<LoginResponse>> {

    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.baseUrl}/changePassword`,
        data
      )
      .pipe(
        tap(response => {
          // إذا أعاد الـ API رمزًا جديدًا بعد تغيير كلمة المرور نستخدمه،
          // وإلا يبقى الرمز الحالي كما هو
          if (response.success && response.data?.token) {
            this.setToken(response.data.token);
          }
        })
      );
  }

  logout(): void {
    this.clearToken();
    this.user.clearUser();
  }

  getToken(): string | null {
    return this.token();
  }

  // مسجَّل الدخول = يوجد رمز + توجد بيانات مستخدم
  isLoggedIn(): boolean {
    return !!this.token() && this.user.getUser() !== null;
  }


  private setToken(token: string): void {
    this.token.set(token);
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  private clearToken(): void {
    this.token.set(null);
    sessionStorage.removeItem(TOKEN_KEY);
  }
}