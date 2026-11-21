import { Routes } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';

import { attendanceAccessGuard } from '../../core/guards/attendance-access-guard';
import { roleMatchGuard } from '../../core/guards/role-match-guard';
import { UserRole } from '../../core/models/user-role';
import { ATTENDANCE_STAFF_ROLES } from '../../core/services/attendance-access';

// Three routes share the same path (/attendance).
// The router takes the first one that matches the role of the user.
export const ATTENDANCE_ROUTES: Routes = [

  // Admin / Assistant Principal / Teacher: the attendance page.
  {
    path: '',

    // Skipped for the other roles (the next route is used instead).
    canMatch: [roleMatchGuard],
    data: {
      roles: ATTENDANCE_STAFF_ROLES
    },

    // GET /api/attendance/my-access must say canRecord: true.
    canActivate: [attendanceAccessGuard],

    // The date picker needs a date adapter.
    // It is provided here so it is only loaded with the attendance pages.
    providers: [
      provideNativeDateAdapter()
    ],

    loadComponent: () =>
      import('./attendance-page/attendance-page')
        .then(m => m.AttendancePage)
  },

  // Student: «حضوري» (their own attendance, read only).
  {
    path: '',
    canMatch: [roleMatchGuard],
    data: {
      roles: [UserRole.Student]
    },
    loadComponent: () =>
      import('./student-attendance/my-attendance/my-attendance')
        .then(m => m.MyAttendance)
  },

  // Parent: «حضور أبنائي» (their children's attendance, read only).
  {
    path: '',
    canMatch: [roleMatchGuard],
    data: {
      roles: [UserRole.Parent]
    },
    loadComponent: () =>
      import('./student-attendance/children-attendance/children-attendance')
        .then(m => m.ChildrenAttendance)
  }

];
