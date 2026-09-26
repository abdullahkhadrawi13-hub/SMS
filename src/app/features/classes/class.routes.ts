import { Routes } from '@angular/router';

export const CLASS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./class-list/class-list')
        .then(m => m.ClassList)
  }
];