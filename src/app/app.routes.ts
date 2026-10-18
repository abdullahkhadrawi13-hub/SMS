import { Routes } from '@angular/router';


import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { Login } from './features/auth/login/login';
import { ChangePassword } from './features/auth/change-password/change-password';

import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { mustChangePasswordGuard } from './core/guards/must-change-password-guard';

import { DASHBOARD_ROUTES } from './features/dashboard/dashboard.routes';

import { UserRole } from './core/models/user-role';

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
  // authGuard هنا يحمي كل الأبناء، فلا نكرره داخلهم
  // mustChangePasswordGuard: لا دخول لأي صفحة قبل تغيير كلمة المرور المؤقتة
  // roleGuard + data.roles: يوضعان هنا لكل قسم (وليس داخل ملف routes الخاص بالقسم)
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard, mustChangePasswordGuard],

    children: [

      {
        path: 'dashboard',
        children: DASHBOARD_ROUTES
      },

      {
        path: 'students',
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.Admin, UserRole.AssistantPrincipal, UserRole.Teacher]
        },
        loadChildren: () =>
          import('./features/students/students.routes')
            .then(m => m.STUDENTS_ROUTES)
      },

      {
        path: 'classes',
        loadChildren: () =>
          import('./features/classes/classes.routes')
            .then(m => m.CLASSES_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.Admin, UserRole.AssistantPrincipal]
        }
      },

      {
        path: 'sections',
        loadChildren: () =>
          import('./features/sections/sections.routes')
            .then(m => m.SECTIONS_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.Admin, UserRole.AssistantPrincipal]
        }
      },



      {
        path: 'teachers',
        loadChildren: () =>
          import('./features/teachers/teachers.routes')
            .then(m => m.TEACHER_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.Admin, UserRole.AssistantPrincipal]
        }
      },


      {
        path: 'subjects',
        loadChildren: () =>
          import('./features/subjects/subjects.routes')
            .then(m => m.SUBJECTS_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.Admin, UserRole.AssistantPrincipal]
        }
      },




      // صفوفي: صفوف المعلم وشعبه والمواد التي يدرّسها (Teacher فقط)
      // GET /api/teacherassignments/mine
      {
        path: 'my-classes',
        loadChildren: () =>
          import('./features/my-classes/my-classes.routes')
            .then(m => m.MY_CLASSES_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.Teacher]
        }
      },


      // الحضور والغياب: الصفحة المعروضة تُحدَّد حسب الدور داخل attendance.routes.ts
      // (Admin / AssistantPrincipal / Teacher: صفحة الحضور - Student / Parent: Coming Soon)
      {
        path: 'attendance',
        loadChildren: () =>
          import('./features/attendance/attendance.routes')
            .then(m => m.ATTENDANCE_ROUTES)
      },


      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes')
            .then(m => m.SETTINGS_ROUTES),
        canActivate: [roleGuard],
        data: {
          // AssistantPrincipal: read-only academic years only
          // (attendance-officer stays Admin only, see settings.routes.ts).
          roles: [UserRole.Admin, UserRole.AssistantPrincipal]
        }
      },









      {
        path: '**',
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon')
            .then(m => m.ComingSoon)
      }


    ]
  },

  // إذا كتب المستخدم رابطًا خطأً في المتصفح يتم إعادة توجيهه إلى صفحة تسجيل الدخول
  {
    path: '**',
    redirectTo: 'login'
  }

];