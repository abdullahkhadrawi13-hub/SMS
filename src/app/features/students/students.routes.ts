import { Routes } from '@angular/router';

export const STUDENTS_ROUTES: Routes = [

  // /students
  {
    path: '',
    loadComponent: () =>
      import('./students-page/students-page')
        .then(m => m.StudentsPage)
  },

  // /students/:id  (optional ?tab=attendance | grades | parents)
  // Same roles as /students (the roleGuard in app.routes.ts).
  // A teacher can open only their own students: the backend checks it.
  {
    path: ':id',
    loadComponent: () =>
      import('./students-details/students-details')
        .then(m => m.StudentsDetails)
  }

];