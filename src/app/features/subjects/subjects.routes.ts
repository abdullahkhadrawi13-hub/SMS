import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role-guard';

export const SUBJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./subjects-page/subjects-page').then(
        (m) => m.SubjectsPage
      ),
    canActivate: [roleGuard],
    data: {
      roles: [0, 1, 2],
    },
  },
];