import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [

  // /settings : the list of settings options
  {
    path: '',
    loadComponent: () =>
      import('./settings-page/settings-page')
        .then(m => m.SettingsPage)
  },

  // /settings/academic-years
  // Temporary: shows "Coming Soon" until the
  // academic years page is built.
  {
    path: 'academic-years',
    loadComponent: () =>
      import('../../shared/components/coming-soon/coming-soon')
        .then(m => m.ComingSoon)
  },

  // /settings/attendance-officer
  // Temporary: shows "Coming Soon" until the
  // attendance officer page is built.
  {
    path: 'attendance-officer',
    loadComponent: () =>
      import('../../shared/components/coming-soon/coming-soon')
        .then(m => m.ComingSoon)
  }

];