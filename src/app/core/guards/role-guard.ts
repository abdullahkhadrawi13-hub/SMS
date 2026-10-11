import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { User } from '../services/user';
import { UserRole } from '../models/user-role';

export const roleGuard: CanActivateFn = (route, state) => {

  const user = inject(User);
  const router = inject(Router);

  const currentRole = user.getRole();

  const allowedRoles = route.data['roles'] as UserRole[];

  if (
    currentRole !== null &&
    allowedRoles.includes(currentRole)
  ) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};