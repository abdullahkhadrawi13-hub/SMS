import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicTerm } from '../../../../core/models/academic-term';
import { Language } from '../../../../core/services/language';

import {
  AcademicYearView,
  countDays,
  formatLongDate,
  fromApiDate
} from '../academic-years';

// One academic year: a header that opens / closes the card,
// and the table of its terms.
// All data is loaded by the parent page; the card only shows it
// and tells the parent what the user clicked.
@Component({
  selector: 'app-year-card',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './year-card.html',
  styleUrl: './year-card.css',
})
export class YearCard {

  private readonly language = inject(Language);

  // ===== Inputs =====

  // The year, its terms (by termNumber) and its badge.
  readonly view = input.required<AcademicYearView>();

  // The card shows its terms table only when open.
  readonly expanded = input(false);

  // Admin: add term, edit, activate / deactivate, set current.
  readonly canManage = input(false);

  // id of the term with a request running (disables the term actions).
  readonly busyTermId = input<number | null>(null);

  // ===== Outputs =====

  readonly toggle = output<void>();
  readonly editYear = output<void>();
  readonly addTerm = output<void>();
  readonly editTerm = output<AcademicTerm>();
  readonly toggleTermStatus = output<AcademicTerm>();
  readonly setCurrentTerm = output<AcademicTerm>();

  // ===== View =====

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // The actions column has only Admin actions,
  // so the whole column is hidden for read-only users.
  readonly displayedColumns = computed(() =>
    this.canManage()
      ? ['number', 'name', 'period', 'status', 'current', 'actions']
      : ['number', 'name', 'period', 'status', 'current']
  );

  // id used by aria-controls on the open / close button.
  readonly tableId = computed(
    () => `year-terms-${this.view().year.academicYearId}`
  );

  readonly yearRange = computed(() => {
    const { year } = this.view();
    const isArabic = this.isArabic();

    return `${formatLongDate(year.startDate, isArabic)} — ${formatLongDate(year.endDate, isArabic)}`;
  });

  readonly isBusy = computed(() => this.busyTermId() !== null);


  getTermName(term: AcademicTerm): string {
    return this.isArabic() ? term.nameAr : term.nameEn;
  }

  // The other language under the main name (English under Arabic and back).
  getTermSecondName(term: AcademicTerm): string {
    return this.isArabic() ? term.nameEn : term.nameAr;
  }

  getTermRange(term: AcademicTerm): string {
    const isArabic = this.isArabic();

    return `${formatLongDate(term.startDate, isArabic)} — ${formatLongDate(term.endDate, isArabic)}`;
  }

  getTermDays(term: AcademicTerm): number {
    return countDays(fromApiDate(term.startDate), fromApiDate(term.endDate));
  }

  // "Set as current" only for an active term that is not already current.
  canSetCurrent(term: AcademicTerm): boolean {
    return this.canManage() && term.isActive && !term.isCurrent;
  }

}
