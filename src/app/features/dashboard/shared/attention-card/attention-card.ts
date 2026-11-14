import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';

import { Language } from '../../../../core/services/language';
import { pluralKey } from '../../../../shared/utils/plural';

import { DashboardAttention } from '../dashboard.models';
import { groupSectionsByClass, sectionName } from '../dashboard-names';


// "يحتاج انتباهك" on the Admin and AssistantPrincipal dashboards:
// sections that have not started today's attendance, sections recorded
// partly, incomplete subject plans and the attendance officer.
//
// isAdmin changes what the AssistantPrincipal sees (it has no right to):
//   - "راجع الخطط" becomes "عرض الخطط" (the plans are read only for them),
//   - no "تغيير" link next to the attendance officer.
//
// For now the links have no action: they get their routes when the
// dashboard is connected to the backend.
@Component({
  selector: 'app-attention-card',
  imports: [
    TranslatePipe,
    MatIconModule,
  ],
  templateUrl: './attention-card.html',
  styleUrl: './attention-card.css',
})
export class AttentionCard {

  private readonly language = inject(Language);

  readonly data = input.required<DashboardAttention>();
  readonly isAdmin = input(false);

  readonly pluralKey = pluralKey;

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // "السابع ب · التاسع ج · العاشر أ، ب، ج" / "Grade 7 B · Grade 9 C · Grade 10 A, B, C"
  readonly notStartedList = computed(() =>
    groupSectionsByClass(this.data().notStartedSections, this.isArabic())
  );

  // "الثامن ج: 15 من 19 طالبًا", one line per partial section.
  readonly partialLines = computed(() =>
    this.data().partialSections.map(section => ({
      name: sectionName(section, this.isArabic()),
      recorded: section.recordedCount,
      total: section.studentCount,
    }))
  );

  readonly officerName = computed(() => {
    const officer = this.data().attendanceOfficer;

    if (!officer) {
      return null;
    }

    return this.isArabic() ? officer.nameAr : officer.nameEn;
  });

  // Nothing to show at all (every list empty and an officer is set).
  readonly isAllClear = computed(() => {
    const data = this.data();

    return data.notStartedSections.length === 0
      && data.partialSections.length === 0
      && data.incompletePlansCount === 0
      && data.attendanceOfficer !== null;
  });
}
