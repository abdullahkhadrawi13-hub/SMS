import { Routes } from '@angular/router';

// roleGuard لأولياء الأمور موجود في app.routes.ts مثل باقي الأقسام
export const PARENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./parents-page/parents-page')
        .then(m => m.ParentsPage)
  }
];
