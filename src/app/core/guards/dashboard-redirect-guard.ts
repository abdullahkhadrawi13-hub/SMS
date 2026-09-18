import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { User } from '../services/user';

export const dashboardRedirectGuard: CanActivateFn = () => {

  const user = inject(User);
  const router = inject(Router);

  const currentRole = user.getRole();

  switch (currentRole) {

    case 0:
      return router.createUrlTree(['/dashboard/admin']);

    case 1:
      return router.createUrlTree(['/dashboard/assistant-principal']);

    case 2:
      return router.createUrlTree(['/dashboard/teacher']);

    case 3:
      return router.createUrlTree(['/dashboard/student']);

    case 4:
      return router.createUrlTree(['/dashboard/parent']);

    default:
      return router.createUrlTree(['/login']);
  }
};