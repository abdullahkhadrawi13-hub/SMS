import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicTerm } from '../../../../core/models/academic-term';
import { Language } from '../../../../core/services/language';
import { formatApiDateTimeAsDate } from '../../../../shared/utils/date-time';

import {
  AcademicYearView,
  countDays,
  formatLongDate,
  fromApiDate,
  getGradesStatus,
  GradesStatus
} from '../academic-years';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { MenuBackClose } from '../../../../shared/directives/menu-back-close';

// One academic year: a header that opens / closes the card,
// and the table of its terms (a two-line list on the phone).
// All data is loaded by the parent page; the card only shows it
// and tells the parent what the user clicked.
//
// Navy & gold (15 Nov 2026):
//   - the shared card and table look (.data-card, .data-table in styles.css)
//   - one status badge per term: current (green), active (outlined green)
//     or inactive (grey); the current term also has the gold dot
//   - the grades are text with a lock, not a second badge
//   - "Set as current term" is the first item of the term's ⋮ menu
//     (it was a column of its own, mostly "—")
//   - on the phone "Add term" moves into the year's ⋮ menu
@Component({
  selector: 'app-year-card',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MenuBackClose,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
    StatusBadge,
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

  // Under 720px: the terms become a two-line list (from the page).
  readonly isPhone = input(false);

  // ===== Outputs =====

  readonly toggle = output<void>();
  readonly editYear = output<void>();
  readonly addTerm = output<void>();
  readonly editTerm = output<AcademicTerm>();
  readonly toggleTermStatus = output<AcademicTerm>();
  readonly setCurrentTerm = output<AcademicTerm>();

  // Close / open the term's grades (the parent asks for confirmation first).
  readonly closeGrades = output<AcademicTerm>();
  readonly openGrades = output<AcademicTerm>();

  // ===== View =====

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // The actions column has only Admin actions,
  // so the whole column is hidden for read-only users.
  // The grades column (open / closed) is shown to everyone.
  readonly displayedColumns = computed(() =>
    this.canManage()
      ? ['number', 'name', 'period', 'status', 'grades', 'actions']
      : ['number', 'name', 'period', 'status', 'grades']
  );

  // id used by aria-controls on the open / close button.
  readonly bodyId = computed(
    () => `year-terms-${this.view().year.academicYearId}`
  );

  // "لا فصول بعد" / "فصل واحد" / "فصلان" / "3 فصول" under the year name.
  readonly termsCountKey = computed(() => {
    const count = this.view().terms.length;

    if (count === 0) return 'ACADEMIC_YEARS.YEAR_CARD.TERMS_COUNT.NONE';
    if (count === 1) return 'ACADEMIC_YEARS.YEAR_CARD.TERMS_COUNT.ONE';
    if (count === 2) return 'ACADEMIC_YEARS.YEAR_CARD.TERMS_COUNT.TWO';

    return 'ACADEMIC_YEARS.YEAR_CARD.TERMS_COUNT.FEW';
  });

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

  // open / closed / closed-by-rollover (the chip of the grades column).
  getGradesStatus(term: AcademicTerm): GradesStatus {
    return getGradesStatus(term);
  }

  // The day the grades were closed, under the chip ("" while open).
  getGradesClosedDate(term: AcademicTerm): string {
    return term.gradesClosedAt
      ? formatApiDateTimeAsDate(term.gradesClosedAt, this.isArabic())
      : '';
  }

}
