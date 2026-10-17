import { Routes } from '@angular/router';

export const MY_CLASSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./my-classes-page/my-classes-page')
        .then(m => m.MyClassesPage)
  },

  // The assessments of one subject in one section (one teacher assignment).
  // Opened from a subject line of a "My classes" card.
  {
    path: ':teacherAssignmentId/assessments',
    loadComponent: () =>
      import('./assessments/assessments-page/assessments-page')
        .then(m => m.AssessmentsPage)
  }
];
