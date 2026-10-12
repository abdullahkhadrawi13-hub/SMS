import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';


// Data passed when the dialog is opened.
export interface AssignmentStatusDialogData {

  // true = activate, false = deactivate.
  activate: boolean;

  subjectName: string;
  className: string;
  sectionName: string;
}


// Confirmation before activating / deactivating a subject of a section.
// Deactivating stops the students' enrollments in the subject;
// activating enrolls them again (API Reference, section 8).
// Closes with true when the user confirms.
@Component({
  selector: 'app-assignment-status-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './assignment-status-dialog.html',
  styleUrl: './assignment-status-dialog.css',
})
export class AssignmentStatusDialog {

  readonly data = inject<AssignmentStatusDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(MatDialogRef<AssignmentStatusDialog, boolean>);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
