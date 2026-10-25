import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { TranslatePipe } from '@ngx-translate/core';

import { Section } from '../../../../core/models/section';
import { Language } from '../../../../core/services/language';
import { CardColor } from '../../../../shared/constants/card-colors';
import { pluralKey } from '../../../../shared/utils/plural';

// One section of the class page, as a row:
// letter · name (Arabic + English) · students with a small bar · status · actions.
//
// The bar compares the section with the biggest section of the class,
// so a crowded or an empty section shows at a glance.
@Component({
  selector: 'app-section-row',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
  ],
  templateUrl: './section-row.html',
  styleUrl: './section-row.css',
})
export class SectionRow {

  private readonly language = inject(Language);


  // ===== Inputs =====

  readonly section = input.required<Section>();

  // The class colors (the letter and the bar).
  readonly color = input.required<CardColor>();

  // The biggest student count in the class (the bar's 100%).
  readonly maxStudentCount = input(1);

  // Shows the actions menu (Admin only).
  readonly canManage = input(false);

  // True while a section status is being changed (any section).
  readonly isToggling = input(false);


  // ===== Outputs =====

  readonly edit = output<void>();
  readonly toggleStatus = output<void>();


  // ===== Computed =====

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // The big letter: the name in the current language ("أ" / "A").
  readonly letter = computed(() =>
    this.isArabic() ? this.section().sectionAr : this.section().sectionEn
  );

  // The name in the UI language first ("شعبة أ"), then in the other one ("Section A").
  // Each is written in its own language, whatever the UI language is.
  readonly mainNameKey = computed(() =>
    this.isArabic() ? 'CLASS_SECTIONS.ROW.NAME_AR' : 'CLASS_SECTIONS.ROW.NAME_EN'
  );

  readonly otherNameKey = computed(() =>
    this.isArabic() ? 'CLASS_SECTIONS.ROW.NAME_EN' : 'CLASS_SECTIONS.ROW.NAME_AR'
  );

  readonly mainName = computed(() =>
    this.isArabic() ? this.section().sectionAr : this.section().sectionEn
  );

  readonly otherName = computed(() =>
    this.isArabic() ? this.section().sectionEn : this.section().sectionAr
  );

  // The other name's direction (English is left-to-right, Arabic right-to-left).
  readonly otherNameDir = computed(() => this.isArabic() ? 'ltr' : 'rtl');

  // The bar width, in percent.
  readonly barWidth = computed(() =>
    Math.round(this.section().studentCount / this.maxStudentCount() * 100)
  );

  // The word after the number ("طالب" / "طلاب" / "طالبًا" ...).
  readonly studentsUnitKey = computed(
    () => pluralKey('CLASS_SECTIONS.ROW.STUDENTS_UNIT', this.section().studentCount)
  );

  // An active section with no students: an amber "Empty" badge.
  readonly isEmpty = computed(
    () => this.section().isActive && this.section().studentCount === 0
  );
}
