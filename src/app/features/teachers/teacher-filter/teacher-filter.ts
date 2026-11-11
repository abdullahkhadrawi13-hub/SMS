import { Component, computed, input, output } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

export interface TeacherFilterValues {
  isActive: boolean | null;
}

export const EMPTY_TEACHER_FILTER: TeacherFilterValues = {
  isActive: null
};


// The teachers filter: one list (account status) in the search row,
// no dialog any more (11 Nov 2026, like the students filter).
// A change is applied straight away: it emits filterChange and the page
// reloads the list. The page owns the value (and keeps it in the URL);
// this component only shows it.
// "Clear filters" is on the page, next to the number of results.
@Component({
  selector: 'app-teacher-filter',
  imports: [
    TranslatePipe
  ],
  templateUrl: './teacher-filter.html',
  // The shared look in styles.css ("List page": .list-filters, .filter-select).
  host: { class: 'list-filters' }
})
export class TeacherFilter {

  // The current value (owned by the parent page): null = all.
  readonly isActive = input<boolean | null>(null);

  // The filter changed: the new value.
  readonly filterChange = output<TeacherFilterValues>();

  // The <select> value of the account status: '' | 'true' | 'false'.
  readonly statusValue = computed(() => {
    const value = this.isActive();
    return value === null ? '' : String(value);
  });


  // The <select> gives a string: '' means "All".
  onStatusChange(value: string): void {

    this.filterChange.emit({
      isActive: value === 'true' ? true : value === 'false' ? false : null
    });

  }
}
