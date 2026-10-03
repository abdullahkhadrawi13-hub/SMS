import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role-guard';

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
    data: { roles: [0, 1] },
    loadComponent: () =>
      import('./student-form/student-form')
        .then(m => m.StudentForm)
  },

  // /students/:id/edit
  {
    path: ':id/edit',
    canActivate: [roleGuard],
    data: { roles: [0, 1] },
    loadComponent: () =>
      import('./student-form/student-form')
        .then(m => m.StudentForm)
  }

];