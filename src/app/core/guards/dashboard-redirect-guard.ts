import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { User } from '../services/user';
import { UserRole } from '../models/user-role';

export const dashboardRedirectGuard: CanActivateFn = () => {

  const user = inject(User);
  const router = inject(Router);

  const currentRole = user.getRole();

  switch (currentRole) {

    case UserRole.Admin:
      return router.createUrlTree(['/dashboard/admin']);

    case UserRole.AssistantPrincipal:
      return router.createUrlTree(['/dashboard/assistant-principal']);

    case UserRole.Teacher:
      return router.createUrlTree(['/dashboard/teacher']);

    case UserRole.Student:
      return router.createUrlTree(['/dashboard/student']);

    case UserRole.Parent:
      return router.createUrlTree(['/dashboard/parent']);

    default:
      return router.createUrlTree(['/login']);
  }
};