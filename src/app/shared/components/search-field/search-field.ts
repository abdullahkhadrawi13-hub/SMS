import { Component, input, model, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

// The shared search field of the list pages (students, teachers; parents
// when that list is redesigned): 340px wide, 36px high (44px on the
// phone), the search icon at the start and a ✕ button once something is typed.
// Spec: "الحقول والقوائم المنسدلة" → البحث.
//
// The page owns the text and decides when to search:
//
//   <app-search-field
//     [(search)]="search"
//     [label]="'STUDENTS.SEARCH' | translate"
//     [placeholder]="'STUDENTS.SEARCH_PLACEHOLDER' | translate"
//     [clearLabel]="'STUDENTS.CLEAR_SEARCH' | translate"
//     (searchTyping)="onSearchTyping($event)"
//     (searchSubmit)="onSearch()"
//     (searchClear)="clearSearch()"
//   />
//
// The three texts arrive already translated.
@Component({
  selector: 'app-search-field',
  imports: [
    MatIconModule,
  ],
  templateUrl: './search-field.html',
  styleUrl: './search-field.css',
})
export class SearchField {

  // Current search text. Two-way bound with the page.
  readonly search = model('');

  // What a screen reader calls the field (there is no visible label).
  readonly label = input.required<string>();

  // The grey text inside the empty field.
  readonly placeholder = input('');

  // What a screen reader calls the ✕ button.
  readonly clearLabel = input.required<string>();

  // Emitted on every key the user types (the new text).
  // The page waits 400ms after the last one, then reloads the list.
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
