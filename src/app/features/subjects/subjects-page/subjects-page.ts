import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { SubjectsHeader } from '../subjects-header/subjects-header';
import { SubjectsSearch } from '../subjects-search/subjects-search';
import {
  SubjectsFilter,
  SubjectFilterValues,
} from '../subjects-filter/subjects-filter';
import { SubjectsTable } from '../subjects-table/subjects-table';

@Component({
  selector: 'app-subjects-page',
  imports: [
    SubjectsHeader,
    SubjectsSearch,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslatePipe,
    SubjectsTable,
  ],
  templateUrl: './subjects-page.html',
  styleUrl: './subjects-page.css',
})
export class SubjectsPage {

  // Reference used to open subject filter dialogs.
  private readonly dialog = inject(MatDialog);

  // Stores the currently selected subject status filter.
  readonly statusFilter = signal<boolean | undefined>(undefined);

  // Opens the subject filter dialog and applies the selected values.
  openFilter(): void {
    const current: SubjectFilterValues = {
      isActive: this.statusFilter() ?? null,
    };

    this.dialog
      .open(SubjectsFilter, {
        width: '420px',
        data: current,
      })
      .afterClosed()
      .subscribe((result?: SubjectFilterValues) => {

        // Ignore the result when the dialog is cancelled or closed.
        if (!result) {
          return;
        }

        this.statusFilter.set(
          result.isActive ?? undefined
        );

        // Later, this is where the subject list will be reloaded.
      });
  }
}