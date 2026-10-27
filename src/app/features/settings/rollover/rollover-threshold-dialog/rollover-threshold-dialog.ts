import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';


// changedCount = how many decisions the Admin changed by hand
// in the current preview.
export interface RolloverThresholdDialogData {
  changedCount: number;
}


// "Are you sure?" before saving the rule when the Admin has already
// changed decisions by hand: after saving, the preview is loaded again
// and every decision goes back to the new suggestions.
// Closes with true when the Admin confirms.
@Component({
  selector: 'app-rollover-threshold-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './rollover-threshold-dialog.html',
  styleUrl: './rollover-threshold-dialog.css',
})
export class RolloverThresholdDialog {

  readonly data = inject<RolloverThresholdDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(MatDialogRef<RolloverThresholdDialog, boolean>);


  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
