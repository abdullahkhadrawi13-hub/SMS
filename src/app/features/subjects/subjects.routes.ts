import { Routes } from '@angular/router';

// roleGuard للمواد موجود في app.routes.ts مثل باقي الأقسام
export const SUBJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./subjects-page/subjects-page')
        .then(m => m.SubjectsPage)
  },

  // تفاصيل خطة مادة واحدة (بنودها وأوزانها وعلامة النجاح)
  {
    path: 'plans/:planId',
    loadComponent: () =>
      import('./subject-plans/plan-details-page/plan-details-page')
        .then(m => m.PlanDetailsPage)
  }
];
