import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { Language } from '../../../../core/services/language';
import { CardColor } from '../../../../shared/constants/card-colors';

// The top of a class page: a strip in the class's light color with
// its name, level and badges, three numbers about its sections,
// and (Admin only) "Edit class" + activate / deactivate.
//
// Display only: the page passes the data in, the actions go up.
@Component({
  selector: 'app-class-banner',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
  ],
  templateUrl: './class-banner.html',
  styleUrl: './class-banner.css',
})
export class ClassBanner {

  private readonly language = inject(Language);


  // ===== Inputs =====

  readonly schoolClass = input.required<SchoolClass>();

  // Same colors as the class's card on the classes page.
  readonly color = input.required<CardColor>();

  // The class's sections in the chosen term (for the numbers).
  readonly sections = input<Section[]>([]);

  // false while the sections load or after they failed: no numbers then.
  readonly sectionsLoaded = input(false);

  // Shows "Edit class" and the actions menu (Admin only).
  readonly canManage = input(false);

  // True while the class status is being changed.
  readonly isToggling = input(false);


  // ===== Outputs =====

  readonly editClass = output<void>();
  readonly toggleStatus = output<void>();


  // ===== Computed =====

  readonly className = computed(() =>
    this.language.currentDirection() === 'rtl'
      ? this.schoolClass().classNameAr
      : this.schoolClass().classNameEn
  );

  readonly activeSections = computed(
    () => this.sections().filter(s => s.isActive).length
  );

  // Students in all the class's sections in the chosen term.
  readonly studentsCount = computed(
    () => this.sections().reduce((sum, s) => sum + s.studentCount, 0)
  );

  // Active sections with no students (shown only when there are some).
  readonly emptySections = computed(
    () => this.sections().filter(s => s.isActive && s.studentCount === 0).length
  );
}
