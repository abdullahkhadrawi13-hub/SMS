import { Injectable, signal } from '@angular/core';

import { LoginResponse } from '../models/login-response';

@Injectable({
  providedIn: 'root',
})
export class User {

  private currentUser = signal<LoginResponse | null>(
    this.getStoredUser()
  );

  readonly user = this.currentUser.asReadonly();


  setUser(user: LoginResponse): void {

    this.currentUser.set(user);

    sessionStorage.setItem(
      'user',
      JSON.stringify(user)
    );

    sessionStorage.setItem(
      'token',
      user.token
    );

  }


  clearUser(): void {

    this.currentUser.set(null);

    sessionStorage.removeItem('user');

    sessionStorage.removeItem('token');

  }


  getUser(): LoginResponse | null {

    return this.currentUser();

  }


  getRole(): number | null {

    return this.currentUser()?.role ?? null;

  }


  mustChangePassword(): boolean {

    return this.currentUser()?.mustChangePassword ?? false;

  }


  private getStoredUser(): LoginResponse | null {

    const storedUser = sessionStorage.getItem('user');

    if (!storedUser) {

      return null;

    }

    try {

      return JSON.parse(storedUser) as LoginResponse;

    } catch {

      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');

      return null;

    }

  }

}