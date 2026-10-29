import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { User } from '../services/user';

// عكس mustChangePasswordGuard:
// صفحة /change-password مخصصة لأول تسجيل دخول فقط (كلمة مرور مؤقتة).
// المستخدم العادي يغيّر كلمة المرور من الـ Dialog في الـ navbar،
// فإذا وصل لهذه الصفحة بالرابط نعيده إلى لوحة التحكم.
export const firstLoginGuard: CanActivateFn = () => {

  const user = inject(User);
  const router = inject(Router);

  if (user.mustChangePassword()) {

    return true;

  }

  return router.createUrlTree(['/dashboard']);

};
