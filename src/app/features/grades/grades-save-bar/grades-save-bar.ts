import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { GradesDraftStats } from '../grades';


// The bar at the bottom of the grades page while marks are not saved.
// Shown by the parent page only when there is at least one change.
// Same look as the save bar of the attendance officer page.
@Component({
  selector: 'app-grades-save-bar',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './grades-save-bar.html',
  styleUrl: './grades-save-bar.css',
})
export class GradesSaveBar {

  // How many marks changed, and how many of them cannot be saved.
  readonly stats = input.required<GradesDraftStats>();

  // True while the parent page is saving: the buttons cannot be clicked.
  readonly isSaving = input(false);


  // Back to the saved marks.
  readonly reset = output<void>();

  // POST /api/studentgrades/bulk (by the parent page).
  readonly save = output<void>();
}
