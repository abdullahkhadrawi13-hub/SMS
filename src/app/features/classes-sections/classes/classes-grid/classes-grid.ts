import { Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { ClassCard } from '../class-card/class-card';
import { StateCard } from '../../../../shared/components/state-card/state-card';


// The classes grid: one card per active class (with its sections and
// student count), then the inactive classes under their own heading.
// It also shows the error / first load / empty states.
// "Add class" is the primary button in the page header.
//
// Display only: the parent page owns and loads the data,
// and every action goes up as an output.
@Component({
  selector: 'app-classes-grid',
  imports: [
    ClassCard,
    NgTemplateOutlet,
    MatProgressBarModule,
    TranslatePipe,
    StateCard,
  ],
  templateUrl: './classes-grid.html',
  styleUrl: './classes-grid.css',
})
export class ClassesGrid {

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // All classes, already sorted by level by the parent page.
  readonly classes = input<SchoolClass[]>([]);

  // The sections of each class in the current term (classId -> sections).
  readonly sectionsByClass = input<Map<number, Section[]>>(new Map());

  // false = the sections are still loading, or failed:
  // the cards are shown without sections and counts.
  readonly sectionsLoaded = input(false);

  // Loading and error state of the list.
  readonly isLoading = input(false);

  readonly errorMessage = input('');

  // Shows the cards' actions (Admin only).
  readonly canManage = input(false);

  // id of the class whose status is being changed right now
  // (used to prevent repeated clicks).
  readonly togglingClassId = input<number | null>(null);


  // ===== The two groups =====

  readonly activeClasses = computed(
    () => this.classes().filter(c => c.isActive)
  );

  readonly inactiveClasses = computed(
    () => this.classes().filter(c => !c.isActive)
  );


  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the content.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.classes().length === 0
  );

  // Reload (after add, edit, activate / deactivate): the old cards stay
  // on the screen with a thin progress bar on top, so nothing jumps.
  readonly isRefreshing = computed(() =>
    this.isLoading() && this.classes().length > 0
  );


  // ===== Outputs (the parent page performs the actual actions) =====

  readonly retry = output<void>();

  readonly editClass = output<SchoolClass>();

  readonly toggleStatus = output<SchoolClass>();


  // The sections of a class for its card (null = not loaded).
  sectionsOf(schoolClass: SchoolClass): Section[] | null {
    return this.sectionsLoaded()
      ? (this.sectionsByClass().get(schoolClass.schoolClassId) ?? [])
      : null;
  }
}
