import { Component, inject, signal } from '@angular/core';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';


// Values returned by the parent filter dialog.
export interface ParentFilterValues {
  isActive: boolean | null;
}


// Default filter values when no previous filter is provided.
export const EMPTY_PARENT_FILTER: ParentFilterValues = {
  isActive: null,
};


@Component({
  selector: 'app-parent-filter',

  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslatePipe,
  ],

  templateUrl: './parent-filter.html',
  styleUrl: './parent-filter.css',
})
export class ParentFilter {

  // Reference to the current filter dialog.
  private readonly dialogRef =
    inject(MatDialogRef<ParentFilter>);

  // Previous filter values passed when the dialog is opened.
  private readonly initial =
    inject<ParentFilterValues | null>(
      MAT_DIALOG_DATA,
      { optional: true }
    ) ?? EMPTY_PARENT_FILTER;


  // Stores the currently selected account status.
  readonly isActive = signal<boolean | null>(
    this.initial.isActive
  );


  // Clears all filter values without closing the dialog.
  clear(): void {
    this.isActive.set(null);
  }


  // Closes the dialog and returns the selected filter values.
  apply(): void {
    this.dialogRef.close({
      isActive: this.isActive(),
    } satisfies ParentFilterValues);
  }
}
