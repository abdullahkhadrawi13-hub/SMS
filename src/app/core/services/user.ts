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

    localStorage.setItem(
      'user',
      JSON.stringify(user)
    );
  }

  clearUser(): void {
    this.currentUser.set(null);

    localStorage.removeItem('user');
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

    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as LoginResponse;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }
}