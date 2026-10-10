import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { map } from 'rxjs';

import { AttendanceAccessService } from '../services/attendance-access';

// Opens the attendance page only for a user that can record attendance
// (GET /api/attendance/my-access -> canRecord: true).
// A teacher who is not the attendance officer is sent back to the dashboard,
// even if the link is typed in the browser.
export const attendanceAccessGuard: CanActivateFn = () => {

  const attendanceAccess = inject(AttendanceAccessService);
  const router = inject(Router);

  // Ask the backend first, then decide.
  return attendanceAccess
    .load()
    .pipe(
      map(() =>
        attendanceAccess.canRecord()
          ? true
          : router.createUrlTree(['/dashboard'])
      )
    );
};
