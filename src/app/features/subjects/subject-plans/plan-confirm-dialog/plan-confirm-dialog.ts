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
export interface PlanConfirmData {
  icon: string;

  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;

  confirmKey: string;

  // danger = a red confirm button (delete), warn = the normal button.
  tone: 'warn' | 'danger';
}


// "Are you sure?" before an action on a plan that is hard to undo:
// unlocking or locking the plan, deleting the plan or one of its components.
// Closes with true when the user confirms.
@Component({
  selector: 'app-plan-confirm-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './plan-confirm-dialog.html',
  styleUrl: './plan-confirm-dialog.css',
})
export class PlanConfirmDialog {

  readonly data = inject<PlanConfirmData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(MatDialogRef<PlanConfirmDialog, boolean>);


  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
