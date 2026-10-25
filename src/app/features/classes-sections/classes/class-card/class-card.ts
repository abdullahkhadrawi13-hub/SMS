import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { Language } from '../../../../core/services/language';
import { CardColor } from '../../../../shared/constants/card-colors';
import { pluralKey } from '../../../../shared/utils/plural';
import { getClassColor } from '../../shared/classes-sections-shared';


// One card of the classes page: a light colored card with the class name
// (in the current language), its level, status and graduation badge,
// the letters of its sections, and its sections and students count.
//
// A click anywhere on the card opens the class page (/classes-sections/:classId).
// The actions menu (edit / activate / deactivate) sits above that link.
@Component({
  selector: 'app-class-card',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
  ],
  templateUrl: './class-card.html',
  styleUrl: './class-card.css',
})
export class ClassCard {

  // Used to show the class and section names in the current language.
  private readonly language = inject(Language);


  // ===== Inputs =====

  readonly schoolClass = input.required<SchoolClass>();

  // The class's sections in the current term, sorted by name.
  // null = not loaded (still loading, or failed): nothing is shown for them.
  readonly sections = input<Section[] | null>(null);

  // The position of the card in the grid (chooses its color).
  readonly colorIndex = input(0);

  // Shows the actions menu (Admin only).
  readonly canManage = input(false);

  // True while a class status is being changed
  // (disables activate / deactivate to prevent repeated clicks).
  readonly isToggling = input(false);


  // ===== Outputs =====

  readonly edit = output<void>();
  readonly toggleStatus = output<void>();


  // ===== Computed =====

  // The card colors (grey for an inactive class).
  readonly color = computed<CardColor>(
    () => getClassColor(this.schoolClass(), this.colorIndex())
  );

  readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Class name according to the current language.
  readonly className = computed(() =>
    this.isArabic()
      ? this.schoolClass().classNameAr
      : this.schoolClass().classNameEn
  );

  // Active sections only (an inactive section is shown crossed out).
  readonly activeSectionsCount = computed(
    () => (this.sections() ?? []).filter(s => s.isActive).length
  );

  // Students of the class in the current term (all its sections).
  readonly studentsCount = computed(
    () => (this.sections() ?? []).reduce((sum, s) => sum + s.studentCount, 0)
  );

  // The plural form of the counts ("3 sections", "شعبتان", ...).
  readonly sectionsKey = computed(
    () => pluralKey('CLASSES.COUNTS.SECTIONS', this.activeSectionsCount())
  );

  readonly studentsKey = computed(
    () => pluralKey('CLASSES.COUNTS.STUDENTS', this.studentsCount())
  );

  // Section name according to the current language.
  sectionName(section: Section): string {
    return this.isArabic() ? section.sectionAr : section.sectionEn;
  }
}
