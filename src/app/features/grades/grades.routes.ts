import { Routes } from '@angular/router';

import { roleMatchGuard } from '../../core/guards/role-match-guard';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes-guard';
import { UserRole } from '../../core/models/user-role';

// Three routes share the same path (/grades), like the attendance section.
// The router takes the first one that matches the role of the user.
export const GRADES_ROUTES: Routes = [

  // Admin / Assistant Principal / Teacher: the grade sheet.
  {
    path: '',

    // Skipped for the other roles (the next routes are used instead).
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

  // Student: their own grades in the current term («علاماتي»).
  {
    path: '',
    canMatch: [roleMatchGuard],
    data: {
      roles: [UserRole.Student]
    },
    loadComponent: () =>
      import('./student-grades/my-grades/my-grades')
        .then(m => m.MyGrades)
  },

  // Parent: their children's grades in the current term («علامات أبنائي»).
  {
    path: '',
    canMatch: [roleMatchGuard],
    data: {
      roles: [UserRole.Parent]
    },
    loadComponent: () =>
      import('./student-grades/children-grades/children-grades')
        .then(m => m.ChildrenGrades)
  }

];
