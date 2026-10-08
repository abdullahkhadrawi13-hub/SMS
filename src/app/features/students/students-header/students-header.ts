import { Component, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-students-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './students-header.html',
  styleUrl: './students-header.css',
})
export class StudentsHeader {

  // Emitted when the user clicks the "Add student" button.
  // The parent page opens the form dialog and reloads the list afterwards.
  readonly addStudent = output<void>();
}