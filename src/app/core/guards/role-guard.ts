import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { User } from '../services/user';

export const roleGuard: CanActivateFn = (route, state) => {

  const user = inject(User);
  const router = inject(Router);

  const currentRole = user.getRole();

  const allowedRoles = route.data['roles'] as number[];

  if (
    currentRole !== null &&
    allowedRoles.includes(currentRole)
  ) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};