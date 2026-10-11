import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role-guard';
import { UserRole } from '../../core/models/user-role';

export const STUDENTS_ROUTES: Routes = [

  // /students
  {
    path: '',
    loadComponent: () =>
      import('./students-page/students-page')
        .then(m => m.StudentsPage)
  },

  // /students/new
  {
    path: 'new',
    canActivate: [roleGuard],
    data: { roles: [UserRole.Admin, UserRole.AssistantPrincipal] },
    loadComponent: () =>
      import('./students-form/students-form')
        .then(m => m.StudentsForm)
  },

  // /students/:id/edit
  {
    path: ':id/edit',
    canActivate: [roleGuard],
    data: { roles: [UserRole.Admin, UserRole.AssistantPrincipal] },
    loadComponent: () =>
      import('./students-form/students-form')
        .then(m => m.StudentsForm)
  }

];