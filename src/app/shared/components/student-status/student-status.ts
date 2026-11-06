import { Component, computed, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { StudentStatus } from '../../../core/models/student';


// Label and icon of each student status (studentStatus from the API).
// One place for the whole app: students table, student page,
// parent details and the parent's grades page all use this.
const STUDENT_STATUS_VIEW: Record<StudentStatus, { labelKey: string; icon: string }> = {
  [StudentStatus.Active]:      { labelKey: 'SHARED.STUDENT_STATUS.ACTIVE',      icon: 'school' },
  [StudentStatus.Inactive]:    { labelKey: 'SHARED.STUDENT_STATUS.INACTIVE',    icon: 'logout' },
  [StudentStatus.Graduated]:   { labelKey: 'SHARED.STUDENT_STATUS.GRADUATED',   icon: 'workspace_premium' },
  [StudentStatus.Transferred]: { labelKey: 'SHARED.STUDENT_STATUS.TRANSFERRED', icon: 'swap_horiz' },
};


// The student's status at the school (studentStatus), not the account.
// Its look is different from app-status-badge on purpose (decided 6 Nov 2026),
// so the two are never confused:
//
//   app-status-badge     filled, 6px corners, a dot      → the account (isActive)
//   app-student-status   white, coloured outline, round, → the student (studentStatus)
//                        an icon (never a dot)
//
//   0 Active       منتظم   grey outline   school
//   1 Inactive     منسحب   brown outline  logout
//   2 Graduated    متخرّج   gold outline   workspace_premium
//   3 Transferred  منقول   blue outline   swap_horiz
//
// Usage:
//   <app-student-status [status]="student.studentStatus" />
//
// Colours: src/tokens.css only.
@Component({
  selector: 'app-student-status',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './student-status.html',
  styleUrl: './student-status.css',
  host: {
    '[attr.data-status]': 'status()',
  },
})
export class StudentStatusBadge {
  readonly status = input.required<StudentStatus>();

  // An unknown number shows like "Active" rather than an empty badge.
  protected readonly view = computed(
    () => STUDENT_STATUS_VIEW[this.status()] ?? STUDENT_STATUS_VIEW[StudentStatus.Active],
  );
}
