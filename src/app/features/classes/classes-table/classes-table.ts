import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../core/models/school-class';

@Component({
  selector: 'app-classes-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './classes-table.html',
  styleUrl: './classes-table.css',
})
export class ClassesTable {

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // All classes, already sorted by level by the parent page.
  readonly classes = input<SchoolClass[]>([]);

  // Loading and error state of the list.
  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Shows the edit and activate / deactivate actions (Admin only).
  // The actions column has only these two actions,
  // so the whole column is hidden when this is false.
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

  // Reload (after add, edit, activate / deactivate): the old rows stay
  // on the screen with a thin progress bar on top, so nothing jumps.
  readonly isRefreshing = computed(() =>
    this.isLoading() && this.classes().length > 0
  );

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly retry = output<void>();
  readonly editClass = output<SchoolClass>();
  readonly toggleStatus = output<SchoolClass>();

  // Columns displayed in the classes table.
  // The actions column is added only for users allowed to manage classes.
  readonly displayedColumns = computed(() => {

    const columns = [
      'name',
      'level',
      'graduation',
      'status',
    ];

    if (this.canManage()) {
      columns.push('actions');
    }

    return columns;
  });

  // Returns the class name according to the current language.
  getClassName(schoolClass: SchoolClass): string {
    return document.documentElement.lang === 'ar'
      ? schoolClass.classNameAr
      : schoolClass.classNameEn;
  }
}
