import { Routes } from '@angular/router';

import { DashboardLayout } from '../../layouts/dashboard-layout/dashboard-layout';

import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { AssistantPrincipalDashboard } from './assistant-principal/assistant-principal-dashboard/assistant-principal-dashboard';
import { TeacherDashboard } from './teacher/teacher-dashboard/teacher-dashboard';
import { StudentDashboard } from './student/student-dashboard/student-dashboard';
import { ParentDashboard } from './parent/parent-dashboard/parent-dashboard';

import { authGuard } from '../../core/guards/auth-guard';
import { roleGuard } from '../../core/guards/role-guard';
import { dashboardRedirectGuard } from '../../core/guards/dashboard-redirect-guard';

export const DASHBOARD_ROUTES: Routes = [

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
      },

      {
        path: 'assistant-principal',
        component: AssistantPrincipalDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [1]
        }
      },

      {
        path: 'teacher',
        component: TeacherDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [2]
        }
      },

      {
        path: 'student',
        component: StudentDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [3]
        }
      },

      {
        path: 'parent',
        component: ParentDashboard,
        canActivate: [roleGuard],
        data: {
          roles: [4]
        }
      }

    ]
  }

];