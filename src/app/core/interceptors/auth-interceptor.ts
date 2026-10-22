import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';

import { catchError, throwError } from 'rxjs';

import { Auth } from '../services/auth';

// 1) يضيف رمز الدخول (JWT) لكل طلب عند وجوده.
// 2) 401 = انتهت الجلسة: الرمز انتهى (24 ساعة)، أو تغيّرت كلمة المرور،
//    أو عُطّل الحساب. عندها يُسجَّل الخروج ويُنقل المستخدم لصفحة الدخول.
//
// استثناء: طلب تسجيل الدخول نفسه يعيد 401 عند خطأ اسم المستخدم أو كلمة المرور،
// فيبقى المستخدم في صفحة الدخول ويرى الرسالة.
// كلمة مرور المدير الخاطئة (إعادة تعيين كلمة المرور، الترحيل) تعيد 400 لا 401،
// لذلك لا تُخرج المدير.
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const auth = inject(Auth);
  const router = inject(Router);

  const token = auth.getToken();

  // إضافة JWT عند وجوده
  const authReq = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      const isLoginRequest = req.url.toLowerCase().endsWith('/auth/login');

      if (error.status === 401 && !isLoginRequest) {
        auth.logout();

        if (!router.url.startsWith('/login')) {
          router.navigate(['/login']);
        }
      }

      // الصفحة تستلم الخطأ أيضًا (لإيقاف التحميل مثلًا)
      return throwError(() => error);
    })
  );
};
