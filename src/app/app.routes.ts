import { Routes } from '@angular/router';


import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { Login } from './features/auth/login/login';
import { ChangePassword } from './features/auth/change-password/change-password';

import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

import { DASHBOARD_ROUTES } from './features/dashboard/dashboard.routes';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: '',
    component: AuthLayout,
    children: [

      {
        path: 'login',
        component: Login
      },

      {
        path: 'change-password',
        component: ChangePassword,
        canActivate: [authGuard]
      }

    ]
  },

  // كل الصفحات المحمية داخل الـ Layout (navbar + sidebar)
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],

    children: [

      {
        path: 'dashboard',
        children: DASHBOARD_ROUTES
      },

      {
        path: 'students',
        canActivate: [roleGuard],
        data: {
          roles: [0, 1, 2]
        },
        loadChildren: () =>
          import('./features/students/student.routes')
            .then(m => m.STUDENT_ROUTES)
      },

      {
        path: 'classes',
        loadChildren: () =>
          import('./features/classes/class.routes')
            .then(m => m.CLASS_ROUTES),
        canActivate: [authGuard, roleGuard],
        data: {
          roles: [0, 1, 2]
        }
      },

      // لاحقًا بنفس الطريقة:
      // teachers, parents, classes, sections, subjects ...

    ]
  },

  // إذا كتب المستخدم رابطًا خطأً في المتصفح يتم إعادة توجيهه إلى صفحة تسجيل الدخول
  {
    path: '**',
    redirectTo: 'login'
  }

];