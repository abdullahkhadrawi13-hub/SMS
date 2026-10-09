import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { User } from '../services/user';

// يمنع الدخول إلى الصفحات المحمية ما دام المستخدم ملزمًا بتغيير كلمة المرور
// (أول تسجيل دخول بكلمة مرور مؤقتة)، ويعيده إلى صفحة تغيير كلمة المرور.
export const mustChangePasswordGuard: CanActivateFn = () => {

  const user = inject(User);
  const router = inject(Router);

  if (user.mustChangePassword()) {

    return router.createUrlTree(['/change-password']);

  }

  return true;

};
