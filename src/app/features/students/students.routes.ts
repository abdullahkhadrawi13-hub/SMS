import { Routes } from '@angular/router';

export const STUDENTS_ROUTES: Routes = [

  // /students
  {
    path: '',
    loadComponent: () =>
      import('./students-page/students-page')
        .then(m => m.StudentsPage)
  }

];