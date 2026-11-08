import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { pluralKey } from '../../../shared/utils/plural';

@Component({
  selector: 'app-students-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './students-header.html',
})
export class StudentsHeader {

  // Shows the "Add student" button only for users allowed to add students.
  readonly canManage = input(false);

  // The number under the title: totalCount of the list request
  // (no extra request). null while nothing has loaded yet.
  readonly count = input<number | null>(null);

  // The list used a search or a filter: "3 طلاب يطابقون البحث"
  // instead of "531 طالبًا مسجّلًا".
  readonly hasQuery = input(false);

  // The translation key with the right Arabic plural form
  // (طالب واحد، طالبان، 3 طلاب، 11 طالبًا، 100 طالب).
  readonly countKey = computed(() => {
    const count = this.count();

    if (count === null) {
      return null;
    }

    return pluralKey(
      this.hasQuery() ? 'STUDENTS.COUNT.MATCHING' : 'STUDENTS.COUNT.ALL',
      count
    );
  });

  // Emitted when the user clicks the "Add student" button.
  // The parent page opens the form dialog and reloads the list afterwards.
  readonly addStudent = output<void>();
}