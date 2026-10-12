import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { ClassSubjectRow, ClassSubjectsCounts } from '../subject';


// The subjects of one section: toolbar (title, counters, add),
// table and the states (error / loading / select / empty).
// All data is owned by the parent (class-subjects).
@Component({
  selector: 'app-class-subjects-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './class-subjects-table.html',
  styleUrl: './class-subjects-table.css',
})
export class ClassSubjectsTable {

  // ===== Inputs =====

  readonly rows = input<ClassSubjectRow[]>([]);
  readonly counts = input<ClassSubjectsCounts>({ total: 0, active: 0, inactive: 0 });

  // false until a term, a class and a section are chosen.
  readonly hasSelection = input(false);

  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Shown in the toolbar title and the empty state.
  readonly className = input('');
  readonly sectionName = input('');
  readonly termLabel = input('');

  // Shows the add button and the actions column (Admin only).
  readonly canManage = input(false);

  // true while the add dialog is being prepared (disables the add button).
  readonly openingForm = input(false);


  // ===== Outputs =====

  readonly retry = output<void>();
  readonly addSubject = output<void>();
  readonly editSubject = output<ClassSubjectRow>();
  readonly toggleStatus = output<ClassSubjectRow>();


  // The Assistant Principal has no actions, so the column is hidden.
  readonly displayedColumns = computed(() => {

    const columns = [
      'subject',
      'teacher',
      'passingMark',
      'structure',
      'status',
    ];

    return this.canManage()
      ? [...columns, 'actions']
      : columns;
  });
}
