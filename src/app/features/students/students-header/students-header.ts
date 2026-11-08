import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-students-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './students-header.html',
})
export class StudentsHeader {

  // Shows the "Add student" button only for users allowed to add students.
  readonly canManage = input(false);

  // Emitted when the user clicks the "Add student" button.
  // The parent page opens the form dialog and reloads the list afterwards.
  readonly addStudent = output<void>();
}
