import { Routes } from '@angular/router';

export const CLASSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./classes-page/classes-page')
        .then(m => m.ClassesPage)
  }
];