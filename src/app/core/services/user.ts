import { Injectable, signal } from '@angular/core';

import { LoginResponse } from '../models/login-response';

// بيانات المستخدم بدون رمز الدخول.
// الرمز (JWT) تديره خدمة Auth فقط، وهذه الخدمة مسؤولة عن بيانات المستخدم ودوره.
export type UserProfile = Omit<LoginResponse, 'token'>;

const USER_KEY = 'user';

@Injectable({
  providedIn: 'root',
})
export class User {

  private currentUser = signal<UserProfile | null>(
    this.getStoredUser()
  );

  readonly user = this.currentUser.asReadonly();


  setUser(user: LoginResponse | UserProfile): void {

    // الرمز لا يُحفظ مع بيانات المستخدم
    const profile: UserProfile & { token?: string } = { ...user };

    delete profile.token;

    this.currentUser.set(profile);

    sessionStorage.setItem(
      USER_KEY,
      JSON.stringify(profile)
    );

  }


  clearUser(): void {

    this.currentUser.set(null);

    sessionStorage.removeItem(USER_KEY);

  }


  getUser(): UserProfile | null {

    return this.currentUser();

  }


  getRole(): number | null {

    return this.currentUser()?.role ?? null;

  }


  mustChangePassword(): boolean {

    return this.currentUser()?.mustChangePassword ?? false;

  }


  private getStoredUser(): UserProfile | null {

    const storedUser = sessionStorage.getItem(USER_KEY);

    if (!storedUser) {

      return null;

    }

    try {

      return JSON.parse(storedUser) as UserProfile;

    } catch {

      sessionStorage.removeItem(USER_KEY);

      return null;

    }

  }

}