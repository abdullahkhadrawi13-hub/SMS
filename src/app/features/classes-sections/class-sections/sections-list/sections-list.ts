import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { Language } from '../../../../core/services/language';
import { CardColor } from '../../../../shared/constants/card-colors';
import { SectionStatusFilter } from '../../shared/classes-sections-shared';

import { SectionRow } from '../section-row/section-row';

// The sections of a class, one row each, then the "Add section" row (Admin).
// It also shows the loading, error and empty states.
//
// Display only: the page owns and loads the data,
// and every action goes up as an output.
@Component({
  selector: 'app-sections-list',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    SectionRow,
  ],
  templateUrl: './sections-list.html',
  styleUrl: './sections-list.css',
})
export class SectionsList {

  private readonly language = inject(Language);


  // ===== Inputs =====

  // The sections to show (already filtered by status).
  readonly sections = input<Section[]>([]);

  // How many sections the class has before the status filter.
  readonly totalCount = input(0);

  readonly statusFilter = input<SectionStatusFilter>('all');

  // The class colors and the class itself (for the "Add section" row).
  readonly color = input.required<CardColor>();
  readonly schoolClass = input.required<SchoolClass>();

  // The biggest student count in the class (the rows' bars).
  readonly maxStudentCount = input(1);

  readonly isLoading = input(false);

  // Error message (translation key or API message) shown instead of the rows.
  readonly errorMessage = input('');

  // Shows the rows' actions (Admin only).
  readonly canManage = input(false);

  // Shows the "Add section" row (Admin, active class).
  readonly canAdd = input(false);

  // id of the section whose status is being changed right now.
  readonly togglingSectionId = input<number | null>(null);


  // ===== Outputs =====

  readonly retry = output<void>();
  readonly addSection = output<void>();
  readonly editSection = output<Section>();
  readonly toggleStatus = output<Section>();

  // "Show all sections" after a status filter left nothing to show.
  readonly showAll = output<void>();


  // ===== Loading modes =====

  // First load: nothing on the screen yet, a big spinner.
  readonly isInitialLoading = computed(
    () => this.isLoading() && this.sections().length === 0
  );

  // Reload (term change, after add / edit / activate): the old rows stay
  // with a thin bar on top, so nothing jumps.
  readonly isRefreshing = computed(
    () => this.isLoading() && this.sections().length > 0
  );

  // The class has sections, but none match the status filter.
  readonly isFilteredEmpty = computed(
    () => this.sections().length === 0
      && this.totalCount() > 0
      && this.statusFilter() !== 'all'
  );

  // The "Add section" row: only when the whole list is shown.
  readonly showAddRow = computed(
    () => this.canAdd() && this.statusFilter() === 'all'
  );

  readonly className = computed(() =>
    this.language.currentDirection() === 'rtl'
      ? this.schoolClass().classNameAr
      : this.schoolClass().classNameEn
  );
}
