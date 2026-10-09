import { Routes } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',

    // The date picker needs a date adapter.
    // It is provided here so it is only loaded with the attendance pages.
    providers: [
      provideNativeDateAdapter()
    ],

    loadComponent: () =>
      import('./attendance-page/attendance-page')
        .then(m => m.AttendancePage)
  }
];
