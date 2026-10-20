import { Routes } from '@angular/router';

import { roleMatchGuard } from '../../core/guards/role-match-guard';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes-guard';
import { UserRole } from '../../core/models/user-role';

// Two routes share the same path (/grades), like the attendance section.
// The router takes the first one that matches the role of the user.
export const GRADES_ROUTES: Routes = [

  // Admin / Assistant Principal / Teacher: the grade sheet.
  {
    path: '',

    // Skipped for the other roles (the next route is used instead).
    canMatch: [roleMatchGuard],
    data: {
      roles: [UserRole.Admin, UserRole.AssistantPrincipal, UserRole.Teacher]
    },

    // "Leave without saving?" when marks are not saved yet.
    canDeactivate: [unsavedChangesGuard],

    loadComponent: () =>
      import('./grades-page/grades-page')
        .then(m => m.GradesPage)
  },

  // Student / Parent: they have no grades endpoints yet.
  // Temporary: shows "Coming Soon" until their pages are built.
  {
    path: '',
    loadComponent: () =>
      import('../../shared/components/coming-soon/coming-soon')
        .then(m => m.ComingSoon)
  }

];
