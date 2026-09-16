import { Injectable, signal } from '@angular/core';

import { LoginResponse } from '../models/login-response';

@Injectable({
  providedIn: 'root',
})
export class User {

  private currentUser = signal<LoginResponse | null>(null);

  readonly user = this.currentUser.asReadonly();

  setUser(user: LoginResponse): void {
    this.currentUser.set(user);
  }

  clearUser(): void {
    this.currentUser.set(null);
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
}