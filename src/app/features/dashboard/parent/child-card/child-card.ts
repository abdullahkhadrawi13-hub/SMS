import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { StudentDashboardCard } from '../../../../core/models/dashboard';
import { StudentStatus } from '../../../../core/models/student';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { StudentStatusBadge } from '../../../../shared/components/student-status/student-status';
import { getAvatarTone, getInitialsFromFullName } from '../../../../shared/utils/person-name';

import { DashboardNumbers } from '../../shared/dashboard-numbers/dashboard-numbers';
import { LatestMarks } from '../../shared/latest-marks/latest-marks';
import { DashboardNumber } from '../../shared/dashboard.models';
import { attendanceNumbers, isAbsentToday } from '../../shared/attendance-numbers';


// One child on the Parent dashboard (a card of GET /api/dashboard/parent/me):
// the avatar and name, the class, section and student number,
// "غياب اليوم" when the child's last absence is today, the current term's
// attendance numbers, the newest 3 marks, and a link to the child's grades.
// A former child (graduated, inactive, transferred) shows only the head
// with the student status, without numbers or marks.
@Component({
  selector: 'app-child-card',
  imports: [TranslatePipe, RouterLink, StatusBadge, StudentStatusBadge, DashboardNumbers, LatestMarks],
  templateUrl: './child-card.html',
  styleUrl: './child-card.css',
})
export class ChildCard {

  private readonly language = inject(Language);

  readonly child = input.required<StudentDashboardCard>();

  private readonly isArabic = computed(() => this.language.currentDirection() === 'rtl');

  readonly isCurrent = computed(() => this.child().studentStatus === StudentStatus.Active);
  readonly absentToday = computed(() => isAbsentToday(this.child()));

  readonly name = computed(() => this.isArabic() ? this.child().studentNameAr : this.child().studentNameEn);
  readonly firstName = computed(() => this.name().split(' ')[0]);
  readonly initials = computed(() => getInitialsFromFullName(this.name()));
  readonly avatarTone = computed(() => getAvatarTone(this.child().studentId));

  // "الصف الثامن · ب · 2026000154" / "Grade 8 · B · 2026000154"
  readonly placement = computed(() => {
    const child = this.child();
    return this.isArabic()
      ? `${child.classNameAr} · ${child.sectionAr} · ${child.studentNumber}`
      : `${child.classNameEn} · ${child.sectionEn} · ${child.studentNumber}`;
  });

  readonly numbers = computed<DashboardNumber[]>(() =>
    attendanceNumbers(this.child(), this.isArabic(), false)
  );
}
