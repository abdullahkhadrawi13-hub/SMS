import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { PageHeader } from '../../../../shared/components/page-header/page-header';

// Page title, one description line, and "Add class" (Admin only).
// The term of the counts is not repeated here: it is in the navbar.
@Component({
  selector: 'app-classes-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './classes-header.html',
})
export class ClassesHeader {

  // Shows "Add class" (Admin only).
  readonly canManage = input(false);

  readonly addClass = output<void>();
}
