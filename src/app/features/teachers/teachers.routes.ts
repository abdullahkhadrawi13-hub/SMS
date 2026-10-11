import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role-guard';
import { UserRole } from '../../core/models/user-role';

export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./teachers-page/teachers-page').then(
        (m) => m.TeachersPage
      ),
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Admin, UserRole.AssistantPrincipal],
    },
  },
];