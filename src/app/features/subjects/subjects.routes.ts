import { Routes } from '@angular/router';

// roleGuard للمواد موجود في app.routes.ts مثل باقي الأقسام
export const SUBJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./subjects-page/subjects-page')
        .then(m => m.SubjectsPage)
  }
];