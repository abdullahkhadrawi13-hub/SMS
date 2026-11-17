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
  // The icon sits in a circle of its colour (action-result-dialog.css),
  // so the plain glyphs: ✓, ✕, i, !
  success: { icon: 'check', titleKey: 'SHARED.ACTION_RESULT.SUCCESS' },
  error: { icon: 'close', titleKey: 'SHARED.ACTION_RESULT.ERROR' },
  info: { icon: 'info_i', titleKey: 'SHARED.ACTION_RESULT.INFO' },
  warning: { icon: 'priority_high', titleKey: 'SHARED.ACTION_RESULT.WARNING' }
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

  constructor() {
    // 10px corners and the floating shadow, like the confirm dialog
    // (styles.css: "Confirm dialog panel"), whoever opens it.
    this.dialogRef.addPanelClass('confirm-dialog-panel');
  }

  close(): void {
    this.dialogRef.close();
  }
}