import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-teacher-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './teacher-header.html',
  styleUrl: './teacher-header.css',
})
export class TeacherHeader {

  // Shows the "Add teacher" button only for users allowed to add teachers.
  readonly canManage = input(false);

  // Emitted when the user clicks the "Add teacher" button.
  // The parent page opens the form dialog and reloads the list afterwards.
  readonly addTeacher = output<void>();
}
