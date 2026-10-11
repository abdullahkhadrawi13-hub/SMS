import { Component, output, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';


@Component({
  selector: 'app-officer-teacher-search',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
  ],
  templateUrl: './officer-teacher-search.html',
  styleUrl: './officer-teacher-search.css',
})
export class OfficerTeacherSearch {

  // ===== Output (the parent page sends the search to the backend) =====

  // Emits the search text when the Admin submits or clears the search.
  readonly searchSubmit = output<string>();


  // Current value of the search field (not sent until it is submitted).
  readonly searchText = signal('');


  // Submits the search (Enter key or the search button).
  onSearch(): void {
    this.searchSubmit.emit(this.searchText().trim());
  }


  // Clears the search field: the list goes back to empty.
  clearSearch(): void {
    this.searchText.set('');

    this.searchSubmit.emit('');
  }
}