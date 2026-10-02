import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import {
  ActionResultDialog,
  ActionResultDialogData
} from '../components/action-result-dialog/action-result-dialog';

@Injectable({
  providedIn: 'root',
})
export class ActionResult {

  private readonly dialog = inject(MatDialog);

  success(message: string): void {
    this.dialog.open(ActionResultDialog, {
      data: {
        type: 'success',
        message
      } satisfies ActionResultDialogData
    });
  }

  error(message: string): void {
    this.dialog.open(ActionResultDialog, {
      data: {
        type: 'error',
        message
      } satisfies ActionResultDialogData
    });
  }

}