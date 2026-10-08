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


// Values returned by the subject filter dialog.
export interface SubjectFilterValues {
  isActive: boolean | null;
}


// Default filter values when no previous filter is provided.
export const EMPTY_SUBJECT_FILTER: SubjectFilterValues = {
  isActive: null,
};


@Component({
  selector: 'app-subjects-filter',

  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslatePipe,
  ],

  templateUrl: './subjects-filter.html',
  styleUrl: './subjects-filter.css',
})
export class SubjectsFilter {

  // Reference to the current filter dialog.
  private readonly dialogRef =
    inject(MatDialogRef<SubjectsFilter>);

  // Previous filter values passed when the dialog is opened.
  private readonly initial =
    inject<SubjectFilterValues | null>(
      MAT_DIALOG_DATA,
      { optional: true }
    ) ?? EMPTY_SUBJECT_FILTER;


  // Stores the currently selected subject status.
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
    } satisfies SubjectFilterValues);
  }
}