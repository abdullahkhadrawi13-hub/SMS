import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';


// The names shown in the question (in the language of the page).
export interface ParentUnlinkConfirmData {
  parentName: string;
  childName: string;
  childFirstName: string;
}


// "Are you sure?" before unlinking a child from a parent.
// Same layout as the grades-status-dialog (Settings → Academic years).
// Closes with true when the user confirms; the details dialog sends the request.
@Component({
  selector: 'app-parent-unlink-confirm',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './parent-unlink-confirm.html',
  styleUrl: './parent-unlink-confirm.css',
})
export class ParentUnlinkConfirm {

  readonly data = inject<ParentUnlinkConfirmData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(MatDialogRef<ParentUnlinkConfirm, boolean>);


  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
