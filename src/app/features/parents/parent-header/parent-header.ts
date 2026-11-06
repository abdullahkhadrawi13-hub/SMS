import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-parent-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './parent-header.html',
})
export class ParentHeader {

  // Shows the "Add parent" button only for users allowed to add parents.
  readonly canManage = input(false);

  // Emitted when the user clicks the "Add parent" button.
  // The parent page opens the form dialog and reloads the list afterwards.
  readonly addParent = output<void>();
}
