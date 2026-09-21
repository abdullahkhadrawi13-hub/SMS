import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role-guard';

// مسار الأب 'students' (والصلاحيات العامة roles: [0, 1, 2]) معرّف في app.routes.ts
export const STUDENT_ROUTES: Routes = [

  // /students
  {
    path: '',
    loadComponent: () =>
      import('./student-list/student-list')
        .then(m => m.StudentList)
  },

  // /students/new  (لازم قبل :id)
  {
    path: 'new',
    canActivate: [roleGuard],
    data: {
      roles: [0, 1]        // المعلم (2) يشوف فقط ولا يضيف
    },
    loadComponent: () =>
      import('./student-form/student-form')
        .then(m => m.StudentForm)
  },

  // /students/15
  {
    path: ':id',
    loadComponent: () =>
      import('./student-details/student-details')
        .then(m => m.StudentDetails)
  },

  // /students/15/edit
  {
    path: ':id/edit',
    canActivate: [roleGuard],
    data: {
      roles: [0, 1]
    },
    loadComponent: () =>
      import('./student-form/student-form')
        .then(m => m.StudentForm)
  }

];