import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import {
  ActionResultDialog,
  ActionResultDialogData,
  ActionResultType
} from '../components/action-result-dialog/action-result-dialog';

@Injectable({
  providedIn: 'root',
})
export class ActionResult {

  private readonly dialog = inject(MatDialog);

  // Shows the result dialog with the given type and message.
  //
  // - 'success' / 'error': the result of a backend request.
  //   The message comes from the backend (ApiMessageService).
  // - 'info' / 'warning': a notice from the frontend
  //   (not the result of a request).
  show(type: ActionResultType, message: string): void {
    this.dialog.open(ActionResultDialog, {
      data: {
        type,
        message
      } satisfies ActionResultDialogData
    });
  }

}