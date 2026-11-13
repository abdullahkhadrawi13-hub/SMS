import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';


// What the confirmation dialog shows. Every text is a translation key.
export interface ConfirmDialogData {
  icon: string;

  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;

  confirmKey: string;

  // danger = a red confirm button and a red icon (delete, discard changes),
  // warn   = the normal navy button and a yellow icon (lock, unlock…).
  tone: 'warn' | 'danger';
}


// The shared "Are you sure?" dialog (moved here from the subjects section
// on 13 Nov 2026, when it got the navy & gold look).
// Used before an action that is hard to undo: discarding a form's changes,
// unlocking / locking / deleting a subject plan or one of its components,
// leaving the grade sheet with unsaved marks…
//
//   this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
//     maxWidth: '95vw',
//     data: { icon: 'delete', titleKey: '…', messageKey: '…', confirmKey: '…', tone: 'danger' },
//   })
//
// Closes with true when the user confirms (false or nothing otherwise).
// The red button is only for a destructive action (spec: الأزرار).
@Component({
  selector: 'app-confirm-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {

  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(MatDialogRef<ConfirmDialog, boolean>);


  constructor() {
    // 10px corners and the floating shadow (styles.css: "Confirm dialog panel"),
    // whoever opens it.
    this.dialogRef.addPanelClass('confirm-dialog-panel');
  }


  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
