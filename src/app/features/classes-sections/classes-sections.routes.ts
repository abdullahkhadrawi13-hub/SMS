import { Routes } from '@angular/router';

// The "Classes & Sections" section (one item in the sidebar).
// Same roles for both pages: the roleGuard in app.routes.ts
// (Admin and AssistantPrincipal; the AssistantPrincipal only reads).
export const CLASSES_SECTIONS_ROUTES: Routes = [

  // /classes-sections — one card per class
  {
    path: '',
    loadComponent: () =>
      import('./classes/classes-page/classes-page')
        .then(m => m.ClassesPage)
  },

  // /classes-sections/:classId — one class and its sections
  {
    path: ':classId',
    loadComponent: () =>
      import('./class-sections/class-sections-page/class-sections-page')
        .then(m => m.ClassSectionsPage)
  }

];
