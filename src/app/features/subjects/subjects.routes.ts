import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role-guard';
import { UserRole } from '../../core/models/user-role';

export const SUBJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./subjects-page/subjects-page').then(
        (m) => m.SubjectsPage
      ),
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Admin, UserRole.AssistantPrincipal, UserRole.Teacher],
    },
  },
];