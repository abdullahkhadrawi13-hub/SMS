import { Routes } from '@angular/router';

export const SECTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./section-list/section-list')
        .then(m => m.SectionList)
  }
];