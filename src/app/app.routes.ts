import { Routes } from '@angular/router';

import { Login } from './features/auth/login/login';
import { ChangePassword } from './features/auth/change-password/change-password';

import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';

import { AdminDashboard } from './features/dashboard/admin/admin-dashboard/admin-dashboard';
import { AssistantPrincipalDashboard } from './features/dashboard/assistant-principal/assistant-principal-dashboard/assistant-principal-dashboard';
import { TeacherDashboard } from './features/dashboard/teacher/teacher-dashboard/teacher-dashboard';
import { StudentDashboard } from './features/dashboard/student/student-dashboard/student-dashboard';
import { ParentDashboard } from './features/dashboard/parent/parent-dashboard/parent-dashboard';

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

      // Dashboard الرئيسي
      // يوجه المستخدم حسب الـ Role
      {
        path: '',
        canActivate: [dashboardRedirectGuard],
        children: []
      },

      // Admin
      {
        path: 'admin',
        component: AdminDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [0]
        }
      },

      // Assistant Principal
      {
        path: 'assistant-principal',
        component: AssistantPrincipalDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [1]
        }
      },

      // Teacher
      {
        path: 'teacher',
        component: TeacherDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [2]
        }
      },

      // Student
      {
        path: 'student',
        component: StudentDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [3]
        }
      },

      // Parent
      {
        path: 'parent',
        component: ParentDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [4]
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