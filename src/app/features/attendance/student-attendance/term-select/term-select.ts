import { Component, computed, inject, input, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { AttendanceTermOption, getTermLabelParams } from '../student-attendance';


// "Academic term": the list of the student's terms, newest first
// ("الفصل الأول، 2026/2027"). The page shows it only when there is more
// than one term. The shared field look (styles.css: .field-box.is-select).
@Component({
  selector: 'app-attendance-term-select',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './term-select.html',
  styleUrl: './term-select.css',
})
export class AttendanceTermSelect {

  private readonly language = inject(Language);

  readonly options = input.required<AttendanceTermOption[]>();

  readonly value = input<number | null>(null);

  readonly valueChange = output<number>();

  readonly choices = computed(() => {

    const isArabic = this.language.currentDirection() === 'rtl';

    return this.options().map(option => ({
      id: option.academicTermId,
      label: getTermLabelParams(option, isArabic),
    }));
  });

  onChange(value: string): void {
    this.valueChange.emit(Number(value));
  }
}
