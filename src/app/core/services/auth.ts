import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { LoginRequest } from '../models/login-request';
import { ChangePasswordRequest } from '../models/change-password-request';
import { LoginResponse } from '../models/login-response';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:5253/api/Auth';

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/Login`, data)
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
        })
      );
  }

  changePassword(
    data: ChangePasswordRequest
  ): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.baseUrl}/changePassword`,
      data
    );
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
