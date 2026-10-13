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
  }
  
];