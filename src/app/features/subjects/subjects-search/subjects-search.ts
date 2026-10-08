import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-subjects-search',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './subjects-search.html',
  styleUrl: './subjects-search.css',
})
export class SubjectsSearch {

  // Stores the current value entered in the search field.
  search = signal('');

  // Emits the current search value whenever the input changes.
  searchChange = output<string>();

  // Emits the search value when the user explicitly submits the search.
  searchSubmit = output<string>();

  // Clears the search field and notifies the parent component.
  clearSearch(): void {
    this.search.set('');

    this.searchChange.emit('');
    this.searchSubmit.emit('');
  }

  // Submits the current search value to the parent component.
  onSearch(): void {
    this.searchSubmit.emit(this.search().trim());
  }
}