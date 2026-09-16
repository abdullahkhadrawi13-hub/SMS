import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { LoginRequest } from '../models/login-request';
import { LoginResponse } from '../models/login-response';
import { ChangePasswordRequest } from '../models/change-password-request';
import { User } from './user';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private http = inject(HttpClient);
  private user = inject(User);

  private readonly baseUrl = 'http://localhost:5253/api/Auth';

  login(data: LoginRequest): Observable<ApiResponse<LoginResponse>> {

    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.baseUrl}/Login`,
        data
      )
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            localStorage.setItem('token', response.data.token);
          }
        })
      );
  }

  changePassword(
    data: ChangePasswordRequest
  ): Observable<ApiResponse<LoginResponse>> {

    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.baseUrl}/changePassword`,
      data
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.user.clearUser();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}