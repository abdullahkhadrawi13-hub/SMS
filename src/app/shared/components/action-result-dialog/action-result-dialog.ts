import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

export type ActionResultType = 'success' | 'error';

export interface ActionResultDialogData {
  type: ActionResultType;
  message: string;
}

@Component({
  selector: 'app-action-result-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './action-result-dialog.html',
  styleUrl: './action-result-dialog.css'
})
export class ActionResultDialog {

  readonly data = inject<ActionResultDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(MatDialogRef<ActionResultDialog>);

  close(): void {
    this.dialogRef.close();
  }

  get icon(): string {
    return this.data.type === 'success'
      ? 'check_circle'
      : 'error';
  }
}