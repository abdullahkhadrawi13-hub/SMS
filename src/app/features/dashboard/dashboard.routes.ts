import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role-guard';
import { dashboardRedirectGuard } from '../../core/guards/dashboard-redirect-guard';
import { UserRole } from '../../core/models/user-role';

// هذه المسارات أبناء لـ 'dashboard' (معرّف في app.routes.ts)
// الـ Layout والـ authGuard صاروا في الأب، فما بنكررهم هون
//
// كل لوحة بـ loadComponent (مثل باقي الأقسام بـ loadChildren):
// كل دور ينزّل لوحته فقط عند فتحها، بدل الخمس لوحات مع أول فتح للموقع.
export const DASHBOARD_ROUTES: Routes = [

  {
    path: '',
    canActivate: [dashboardRedirectGuard],
    children: []
  },

  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin-dashboard/admin-dashboard')
        .then(m => m.AdminDashboard),
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Admin]
    }
  },

  {
    path: 'assistant-principal',
    loadComponent: () =>
      import('./assistant-principal/assistant-principal-dashboard/assistant-principal-dashboard')
        .then(m => m.AssistantPrincipalDashboard),
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.AssistantPrincipal]
    }
  },

  {
    path: 'teacher',
    loadComponent: () =>
      import('./teacher/teacher-dashboard/teacher-dashboard')
        .then(m => m.TeacherDashboard),
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Teacher]
    }
  },

  {
    path: 'student',
    loadComponent: () =>
      import('./student/student-dashboard/student-dashboard')
        .then(m => m.StudentDashboard),
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Student]
    }
  },

  {
    path: 'parent',
    loadComponent: () =>
      import('./parent/parent-dashboard/parent-dashboard')
        .then(m => m.ParentDashboard),
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Parent]
    }
  }

];
