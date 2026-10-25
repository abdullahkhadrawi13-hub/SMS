import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { SubjectDto } from '../../../../core/models/subject';


@Component({
  selector: 'app-subjects-catalog-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-catalog-table.html',
  styleUrl: './subjects-catalog-table.css',
})
export class SubjectsCatalogTable {

  // ===== Inputs (all data is owned and loaded by the parent) =====

  // Subjects after the search and the filter.
  readonly subjects = input<SubjectDto[]>([]);

  // Loading and error state of the list.
  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // true while a search or a filter is applied (changes the empty message).
  readonly isFiltered = input(false);

  // Shows the actions column: edit and activate / deactivate (Admin only).
  readonly canManage = input(false);

  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the content.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.subjects().length === 0
  );

  // Reload: the old data stays on the screen with a thin progress bar
  // on top, so the content does not disappear and jump.
  readonly isRefreshing = computed(() =>
    this.isLoading() && !(this.subjects().length === 0)
  );


  // ===== Outputs (the parent performs the actual actions) =====

  readonly retry = output<void>();
  readonly editSubject = output<SubjectDto>();
  readonly toggleStatus = output<SubjectDto>();


  // Columns displayed in the subject table.
  // The Assistant Principal has no actions, so the column is hidden.
  readonly displayedColumns = computed(() => {

    const columns = [
      'subjectId',
      'nameAr',
      'nameEn',
      'status',
    ];

    return this.canManage()
      ? [...columns, 'actions']
      : columns;
  });
}
