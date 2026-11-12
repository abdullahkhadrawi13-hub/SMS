import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { Language } from '../../../../core/services/language';
import { pluralKey } from '../../../../shared/utils/plural';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { getClassCounts } from '../../shared/classes-sections-shared';


// The header of a class page (replaces the old coloured banner):
//   ← Classes & Sections                         (back link)
//   Grade 8  [Graduation class] [Inactive]       (h1 + badges)
//   Level 8 · 3 sections · 64 students           (in the chosen term)
//   Edit class · ⋮ (activate / deactivate) · Add section   (Admin)
@Component({
  selector: 'app-class-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: './class-header.html',
})
export class ClassHeader {

  private readonly language = inject(Language);


  // ===== Inputs =====

  readonly schoolClass = input.required<SchoolClass>();

  // The class's sections in the chosen term (for the counts).
  readonly sections = input<Section[]>([]);

  // false while the sections load, or when they failed: the counts are hidden.
  readonly sectionsLoaded = input(false);

  // Edit / activate / deactivate the class (Admin only).
  readonly canManage = input(false);

  // "Add section": Admin, and the class is active.
  readonly canAddSection = input(false);

  // True while the class status is being changed (prevents repeated clicks).
  readonly isToggling = input(false);


  // ===== Outputs =====

  readonly editClass = output<void>();
  readonly toggleStatus = output<void>();
  readonly addSection = output<void>();


  // ===== Computed =====

  readonly className = computed(() =>
    this.language.currentDirection() === 'rtl'
      ? this.schoolClass().classNameAr
      : this.schoolClass().classNameEn
  );

  private readonly counts = computed(() => getClassCounts(this.sections()));

  readonly activeSections = computed(() => this.counts().activeSections);
  readonly students = computed(() => this.counts().students);

  readonly sectionsKey = computed(
    () => pluralKey('CLASSES.COUNTS.SECTIONS', this.activeSections())
  );

  readonly studentsKey = computed(
    () => pluralKey('CLASSES.COUNTS.STUDENTS', this.students())
  );
}
