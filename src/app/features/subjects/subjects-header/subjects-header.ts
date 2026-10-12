import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-subjects-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-header.html',
  styleUrl: './subjects-header.css',
})
export class SubjectsHeader {

  // Translation keys of the title and subtitle.
  // The teacher sees "My subjects", everyone else sees "Subjects".
  readonly titleKey = input('SUBJECTS.HEADER.TITLE');
  readonly subtitleKey = input('SUBJECTS.HEADER.SUBTITLE');

  // Shows the "Add subject" button.
  // The parent page shows it for the Admin, on the subjects list tab only.
  readonly showAdd = input(false);

  // Emitted when the user clicks the "Add subject" button.
  // The parent page opens the form dialog and reloads the list afterwards.
  readonly addSubject = output<void>();
}
