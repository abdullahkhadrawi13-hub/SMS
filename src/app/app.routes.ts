import { Routes } from '@angular/router';

import { Login } from './features/auth/login/login';
import { ChangePassword } from './features/auth/change-password/change-password';

import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';

import { AdminDashboard } from './features/dashboard/admin/admin-dashboard/admin-dashboard';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { dashboardRedirectGuard } from './core/guards/dashboard-redirect-guard';

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
    canActivate: [authGuard],

    children: [

      {
        path: '',
        canActivate: [dashboardRedirectGuard],
        children: []
      },

      {
        path: 'admin',
        component: AdminDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [0]
        }
      }

    ]
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