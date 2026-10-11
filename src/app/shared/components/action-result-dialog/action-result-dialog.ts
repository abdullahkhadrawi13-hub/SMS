import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

export type ActionResultType = 'success' | 'error' | 'info' | 'warning';

export interface ActionResultDialogData {
  type: ActionResultType;
  message: string;
}

const RESULT_CONFIG: Record<
  ActionResultType,
  { icon: string; titleKey: string }
> = {
  success: { icon: 'check_circle', titleKey: 'SHARED.ACTION_RESULT.SUCCESS' },
  error: { icon: 'cancel', titleKey: 'SHARED.ACTION_RESULT.ERROR' },
  info: { icon: 'info', titleKey: 'SHARED.ACTION_RESULT.INFO' },
  warning: { icon: 'error', titleKey: 'SHARED.ACTION_RESULT.WARNING' }
};

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

  readonly config = RESULT_CONFIG[this.data.type];

  private readonly dialogRef =
    inject(MatDialogRef<ActionResultDialog>);

  close(): void {
    this.dialogRef.close();
  }
}