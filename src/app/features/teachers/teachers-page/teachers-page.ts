import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { TeacherHeader } from '../teacher-header/teacher-header';
import { TeacherSearch } from '../teacher-search/teacher-search';
import {TeacherFilter,TeacherFilterValues,} from '../teacher-filter/teacher-filter';
import { TeacherTable } from '../teacher-table/teacher-table';



import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-teachers-page',
  imports: [TeacherHeader, TeacherSearch, MatButtonModule, MatIconModule,MatDialogModule,TranslatePipe,TeacherTable],
  templateUrl: './teachers-page.html',
  styleUrl: './teachers-page.css',
})
export class TeachersPage {

// Reference used to open teacher filter dialogs.
private readonly dialog = inject(MatDialog);

// Stores the currently selected teacher status filter.
readonly statusFilter = signal<boolean | undefined>(undefined);

// Opens the teacher filter dialog and applies the selected values.
openFilter(): void {
  const current: TeacherFilterValues = {
    isActive: this.statusFilter() ?? null,
  };

  this.dialog
    .open(TeacherFilter, {
      width: '420px',
      data: current,
    })
    .afterClosed()
    .subscribe((result?: TeacherFilterValues) => {

      // Ignore the result when the dialog is cancelled or closed.
      if (!result) {
        return;
      }

      this.statusFilter.set(
        result.isActive ?? undefined
      );

      // Later, this is where the teacher list will be reloaded.
    });
}




}
