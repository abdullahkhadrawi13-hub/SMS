import { Component, model, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-students-search',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
  ],
  templateUrl: './students-search.html',
  styleUrl: './students-search.css',
})
export class StudentsSearch {

  // Current search text. Two-way bound with the parent page:
  // <app-students-search [(search)]="search" />
  readonly search = model('');

  // Emitted when the user submits the search (Enter key or search button).
  readonly searchSubmit = output<void>();

  // Emitted when the user clears the search field.
  readonly searchClear = output<void>();
}