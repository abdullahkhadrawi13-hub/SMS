import { Component, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sections-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './sections-header.html',
  styleUrl: './sections-header.css',
})
export class SectionsHeader {

  // Emitted when the user clicks the "Add section" button.
  // The parent page opens the form dialog.
  readonly addSection = output<void>();
}