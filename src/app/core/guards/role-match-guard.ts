import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';

import { User } from '../services/user';

// Same idea as roleGuard, but for "canMatch":
// when the role is not in route.data.roles the route is skipped
// (no redirect) and the router tries the next route with the same path.
// This lets one path show a different page for each role.
export const roleMatchGuard: CanMatchFn = (route) => {

  const currentRole = inject(User).getRole();

  const allowedRoles =
    (route.data?.['roles'] ?? []) as number[];

  return (
    currentRole !== null &&
    allowedRoles.includes(currentRole)
  );
};
