import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { Language } from '../../../../core/services/language';
import { pluralKey } from '../../../../shared/utils/plural';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { getClassCounts, isEmptySection } from '../../shared/classes-sections-shared';


// One card of the classes page (spec: البطاقات): a white card with a thin
// border, no shadow and no colour of its own.
//   - the class name (a link to the class page) and the ⋮ menu (Admin)
//   - the level, and the "Graduation class" / "Inactive" badges
//   - one small box per section: its letter and student count
//     (yellow = active with no students, grey = inactive)
//   - the active sections and students count, and an arrow
//
// The name's link covers the whole card, so a click anywhere opens the class.
// The ⋮ button sits above that link.
@Component({
  selector: 'app-class-card',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
    StatusBadge,
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

  // Shows the actions menu (Admin only).
  readonly canManage = input(false);

  // True while a class status is being changed
  // (disables activate / deactivate to prevent repeated clicks).
  readonly isToggling = input(false);


  // ===== Outputs =====

  readonly edit = output<void>();
  readonly toggleStatus = output<void>();


  // ===== Computed =====

  readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Class name according to the current language.
  readonly className = computed(() =>
    this.isArabic()
      ? this.schoolClass().classNameAr
      : this.schoolClass().classNameEn
  );

  // The class's sections with what each box shows.
  readonly sectionBoxes = computed(() =>
    (this.sections() ?? []).map(section => ({
      id: section.sectionId,
      name: this.isArabic() ? section.sectionAr : section.sectionEn,
      count: section.studentCount,
      isInactive: !section.isActive,
      isEmpty: isEmptySection(section),
      studentsKey: pluralKey('CLASSES.COUNTS.STUDENTS', section.studentCount)
    }))
  );

  private readonly counts = computed(() => getClassCounts(this.sections() ?? []));

  readonly activeSectionsCount = computed(() => this.counts().activeSections);
  readonly studentsCount = computed(() => this.counts().students);

  // The plural form of the counts ("3 شعب", "شعبتان", ...).
  readonly sectionsKey = computed(
    () => pluralKey('CLASSES.COUNTS.SECTIONS', this.activeSectionsCount())
  );

  readonly studentsKey = computed(
    () => pluralKey('CLASSES.COUNTS.STUDENTS', this.studentsCount())
  );
}
