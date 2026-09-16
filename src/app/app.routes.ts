import { Routes } from '@angular/router';

import { Login } from './features/auth/login/login';
import { ChangePassword } from './features/auth/change-password/change-password';
import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';

import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [

  {
    path: 'login',
    component: Login
  },

  {
    path: 'change-password',
    component: ChangePassword,
    canActivate: [authGuard]
  },

  {
    path: 'dashboard',
    component: DashboardLayout,
    canActivate: [authGuard]
  },

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'login'
  }

];