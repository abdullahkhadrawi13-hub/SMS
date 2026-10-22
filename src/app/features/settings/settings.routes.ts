import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role-guard';
import { UserRole } from '../../core/models/user-role';

// /settings is open to Admin and AssistantPrincipal (roleGuard in app.routes.ts).
// Inside it, a sub-page that is Admin only has its own roleGuard here,
// because the parent route already lets the AssistantPrincipal in.
export const SETTINGS_ROUTES: Routes = [

  // /settings : the list of settings options
  {
    path: '',
    loadComponent: () =>
      import('./settings-page/settings-page')
        .then(m => m.SettingsPage)
  },

  // /settings/academic-years
  // Admin: manage. AssistantPrincipal: read only.
  {
    path: 'academic-years',
    loadComponent: () =>
      import('./academic-years/academic-years-page/academic-years-page')
        .then(m => m.AcademicYearsPage)
  },

  // /settings/attendance-officer : choose the attendance officer (Admin only)
  {
    path: 'attendance-officer',
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Admin]
    },
    loadComponent: () =>
      import('./attendance-officer/attendance-officer-page/attendance-officer-page')
        .then(m => m.AttendanceOfficerPage)
  },

  // /settings/rollover : move students into the current term (Admin only)
  {
    path: 'rollover',
    canActivate: [roleGuard],
    data: {
      roles: [UserRole.Admin]
    },
    loadComponent: () =>
      import('./rollover/rollover-page/rollover-page')
        .then(m => m.RolloverPage)
  }

];
