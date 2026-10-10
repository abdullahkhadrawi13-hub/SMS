import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { catchError, map, Observable, of, tap } from 'rxjs';

import { AttendanceAccess } from '../../features/attendance/attendance';
import { AttendanceService } from './attendance';
import { User } from './user';

// Roles that have the attendance screen:
// 0 = Admin, 1 = Assistant Principal, 2 = Teacher.
// GET /api/attendance/my-access is open to these roles only.
// (Student = 3 and Parent = 4 have no attendance endpoints yet.)
export const ATTENDANCE_STAFF_ROLES = [0, 1, 2];

// The answer of my-access, kept together with the user it belongs to,
// so one user never gets the answer of the user that logged in before.
interface AttendanceAccessState {
  userId: number;
  access: AttendanceAccess;
}

// Keeps the answer of GET /api/attendance/my-access for the whole app.
// It is used by:
// - the sidebar            (hide the attendance screen when canRecord is false),
// - attendanceAccessGuard  (block /attendance when canRecord is false),
// - the attendance page    (lock the date to today when todayOnly is true,
//                           show the daily summary when canRecord is true),
// - the student details    (attendance history is for full access only).
@Injectable({
  providedIn: 'root'
})
export class AttendanceAccessService {

  private readonly attendanceService = inject(AttendanceService);
  private readonly user = inject(User);

  private readonly state = signal<AttendanceAccessState | null>(null);

  private readonly role = computed(
    () => this.user.user()?.role ?? null
  );

  // The answer of my-access for the CURRENT user.
  // null = not loaded yet, the request failed, or the user is a student / parent.
  readonly access = computed<AttendanceAccess | null>(() => {

    const state = this.state();
    const user = this.user.user();

    return state && user && state.userId === user.userId
      ? state.access
      : null;
  });

  // True for the roles that have the attendance screen.
  readonly isStaff = computed(() => {

    const role = this.role();

    return role !== null && ATTENDANCE_STAFF_ROLES.includes(role);
  });

  // Can the user record attendance?
  // Until my-access answers, the role decides:
  // Admin and AssistantPrincipal always can, a teacher cannot.
  readonly canRecord = computed(() => {

    const access = this.access();

    if (access) {
      return access.canRecord;
    }

    return this.role() === 0 || this.role() === 1;
  });

  // True for the attendance officer: today only, no date picker.
  // Until my-access answers, a teacher is treated as "today only".
  readonly todayOnly = computed(() => {

    const access = this.access();

    if (access) {
      return access.todayOnly;
    }

    return this.role() === 2;
  });

  // Admin and AssistantPrincipal: any past day or today, and the
  // student history. (The attendance officer gets 403 from by-student
  // and by-date.)
  readonly fullAccess = computed(
    () => this.canRecord() && !this.todayOnly()
  );

  // The daily summary is for everyone who records attendance:
  // Admin and AssistantPrincipal see any day,
  // the attendance officer sees today only (todayOnly).
  readonly canViewSummary = computed(
    () => this.canRecord()
  );

  // The attendance screen is hidden from the sidebar for a staff user
  // that cannot record (a teacher who is not the attendance officer).
  // Student / Parent still see it: it opens the Coming Soon page.
  readonly hideFromSidebar = computed(
    () => this.isStaff() && !this.canRecord()
  );


  // GET /api/attendance/my-access
  // Called when the app opens (DashboardLayout) and every time
  // /attendance is opened (attendanceAccessGuard), so a change of the
  // attendance officer is seen without logging in again.
  // Emits the answer, or null when there is none.
  load(): Observable<AttendanceAccess | null> {

    const user = this.user.getUser();

    // Student / Parent: there is nothing to ask the backend.
    if (!user || !ATTENDANCE_STAFF_ROLES.includes(user.role)) {
      return of(null);
    }

    return this.attendanceService
      .getMyAccess()
      .pipe(
        map(response =>
          response.success && response.data
            ? response.data
            : null
        ),

        // A failed request must not break the app:
        // the role decides until the next successful call.
        catchError((error: HttpErrorResponse) => {
          console.error('Failed to load attendance access:', error);

          return of(null);
        }),

        tap(access => {
          if (access) {
            this.state.set({
              userId: user.userId,
              access
            });
          }
        })
      );
  }

}