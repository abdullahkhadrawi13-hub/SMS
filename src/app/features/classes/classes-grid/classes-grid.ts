import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../core/models/school-class';
import { ClassCard } from '../class-card/class-card';


// The classes grid: one colored card per class,
// then the "Add academic class" card (Admin only).
// It also shows the error / first load states.
//
// Display only: the parent page owns and loads the data,
// and every action goes up as an output.
@Component({
  selector: 'app-classes-grid',
  imports: [
    ClassCard,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './classes-grid.html',
  styleUrl: './classes-grid.css',
})
export class ClassesGrid {

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // All classes, already sorted by level by the parent page.
  readonly classes = input<SchoolClass[]>([]);

  // Loading and error state of the list.
  readonly isLoading = input(false);

  readonly errorMessage = input('');

  // Shows the add card and the cards' actions (Admin only).
  readonly canManage = input(false);

  // id of the class whose status is being changed right now
  // (used to prevent repeated clicks).
  readonly togglingClassId = input<number | null>(null);


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

  readonly addClass = output<void>();

  readonly editClass = output<SchoolClass>();

  readonly toggleStatus = output<SchoolClass>();
}
