import { Routes } from '@angular/router';

export const SECTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
  import('./sections-page/sections-page')
    .then(m => m.SectionsPage)
  }
];