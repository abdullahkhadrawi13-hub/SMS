import { Routes } from '@angular/router';

import { Login } from './features/auth/login/login';
import { ChangePassword } from './features/auth/change-password/change-password';

import { authGuard } from './core/guards/auth-guard';

import { DASHBOARD_ROUTES } from './features/dashboard/dashboard.routes';

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

  ...DASHBOARD_ROUTES,





  
  //عندما يفتح المستخدم الموقع بدون كتابة أي مسار، ينقله النظام تلقائيًا لصفحة تسجيل الدخول
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
// إذا كتب المستخدم رابطًا خطأً في المتصفح يتم إعادة توجيهه إلى صفحة تسجيل الدخول
  {
    path: '**',
    redirectTo: 'login'
  }

];