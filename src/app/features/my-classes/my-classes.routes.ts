import { Routes } from '@angular/router';

export const MY_CLASSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./my-classes-page/my-classes-page')
        .then(m => m.MyClassesPage)
  }
];
