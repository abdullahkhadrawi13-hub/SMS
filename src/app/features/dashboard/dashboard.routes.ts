import { Routes } from '@angular/router';

import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { AssistantPrincipalDashboard } from './assistant-principal/assistant-principal-dashboard/assistant-principal-dashboard';
import { TeacherDashboard } from './teacher/teacher-dashboard/teacher-dashboard';
import { StudentDashboard } from './student/student-dashboard/student-dashboard';
import { ParentDashboard } from './parent/parent-dashboard/parent-dashboard';

import { roleGuard } from '../../core/guards/role-guard';
import { dashboardRedirectGuard } from '../../core/guards/dashboard-redirect-guard';
import { UserRole } from '../../core/models/user-role';

// هذه المسارات أبناء لـ 'dashboard' (معرّف في app.routes.ts)
// الـ Layout والـ authGuard صاروا في الأب، فما بنكررهم هون
export const DASHBOARD_ROUTES: Routes = [

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
      roles: [UserRole.Admin]
    }
  },

  {
    path: 'assistant-principal',
    component: AssistantPrincipalDashboard,
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.AssistantPrincipal]
    }
  },

  {
    path: 'teacher',
    component: TeacherDashboard,
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Teacher]
    }
  },

  {
    path: 'student',
    component: StudentDashboard,
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Student]
    }
  },

  {
    path: 'parent',
    component: ParentDashboard,
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Parent]
    }
  }

];