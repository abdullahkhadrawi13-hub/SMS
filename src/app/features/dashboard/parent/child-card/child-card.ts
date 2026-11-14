import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { getFirstName, getFullName, getInitials } from '../../../../shared/utils/person-name';
import { pluralKey } from '../../../../shared/utils/plural';

import { DashboardNumbers } from '../../shared/dashboard-numbers/dashboard-numbers';
import { DashboardNumber, ParentChild } from '../../shared/dashboard.models';
import { joinNames } from '../../shared/dashboard-names';


// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css
// (the same rule as the students table: studentId % 6 + 1).
const AVATAR_TONES = 6;


// One child on the Parent dashboard: the avatar and name, the class,
// section and student number, "غياب اليوم" when the child is absent today,
// then the child's numbers this term (passed, failed, incomplete, days absent)
// and a link to the child's grades.
//
// For now the link has no action: it gets its route (the parent's grades
// page on this child) when the dashboard is connected to the backend.
@Component({
  selector: 'app-child-card',
  imports: [
    TranslatePipe,
    StatusBadge,
    DashboardNumbers,
  ],
  templateUrl: './child-card.html',
  styleUrl: './child-card.css',
})
export class ChildCard {

  private readonly language = inject(Language);

  readonly child = input.required<ParentChild>();

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly name = computed(() => getFullName(this.child(), this.isArabic()));
  readonly firstName = computed(() => getFirstName(this.child(), this.isArabic()));
  readonly initials = computed(() => getInitials(this.child(), this.isArabic()));
  readonly avatarTone = computed(() => (this.child().studentId % AVATAR_TONES) + 1);

  // "الثامن · ب · 2026000154" / "Grade 8 · B · 2026000154"
  readonly placement = computed(() => {
    const child = this.child();

    return this.isArabic()
      ? `${child.classNameAr} · ${child.sectionNameAr} · ${child.studentNumber}`
      : `${child.classNameEn} · ${child.sectionNameEn} · ${child.studentNumber}`;
  });

  readonly numbers = computed<DashboardNumber[]>(() => {
    const child = this.child();
    const isArabic = this.isArabic();

    const failedNumber: DashboardNumber = child.failedSubjects.length > 0
      ? {
        labelKey: 'DASHBOARD.PARENT.NUMBERS.FAILED',
        value: child.failedCount,
        isBad: true,
        captionText: joinNames(child.failedSubjects.map(subject => isArabic ? subject.nameAr : subject.nameEn), isArabic),
      }
      : {
        labelKey: 'DASHBOARD.PARENT.NUMBERS.FAILED',
        value: child.failedCount,
        isBad: child.failedCount > 0,
        captionKey: 'DASHBOARD.PARENT.NUMBERS.FAILED_NONE',
      };

    return [
      {
        labelKey: 'DASHBOARD.PARENT.NUMBERS.PASSED',
        value: child.passedCount,
        captionKey: pluralKey('DASHBOARD.PARENT.NUMBERS.OF_SUBJECTS', child.subjectCount),
        captionParams: { count: child.subjectCount },
      },
      failedNumber,
      {
        labelKey: 'DASHBOARD.PARENT.NUMBERS.INCOMPLETE',
        value: child.incompleteCount,
        captionKey: 'DASHBOARD.PARENT.NUMBERS.INCOMPLETE_CAPTION',
      },
      {
        labelKey: 'DASHBOARD.PARENT.NUMBERS.ABSENT',
        value: child.absentDays,
        captionKey: 'DASHBOARD.PARENT.NUMBERS.ABSENT_CAPTION',
      },
    ];
  });
}
