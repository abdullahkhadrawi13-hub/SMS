import { Routes } from '@angular/router';

// roleGuard للمعلمين موجود في app.routes.ts مثل باقي الأقسام
export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./teachers-page/teachers-page')
        .then(m => m.TeachersPage)
  }
];