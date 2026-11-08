import { Component, model, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-students-search',
  imports: [
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './students-search.html',
  styleUrl: './students-search.css',
})
export class StudentsSearch {

  // Current search text. Two-way bound with the parent page:
  // <app-students-search [(search)]="search" />
  readonly search = model('');

  // Emitted on every key the user types (the new text).
  // The parent page waits 400ms after the last one, then reloads the list.
  readonly searchTyping = output<string>();

  // Emitted when the user presses Enter: search straight away.
  readonly searchSubmit = output<void>();

  // Emitted when the user clears the search field (the ✕ button).
  readonly searchClear = output<void>();


  onInput(value: string): void {

    this.search.set(value);

    this.searchTyping.emit(value);

  }
}
