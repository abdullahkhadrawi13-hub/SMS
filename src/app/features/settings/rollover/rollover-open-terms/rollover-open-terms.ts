import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicTerm } from '../../../../core/models/academic-term';
import { RolloverOpenTerm } from '../../../../core/models/rollover';
import { Language } from '../../../../core/services/language';
import { formatApiDateTimeAsDate } from '../../../../shared/utils/date-time';

import { formatLongDate } from '../../academic-years/academic-years';


// One term of the old year, open or closed.
interface TermRow {
  academicTermId: number;

  // In the language of the page, and the other language under it.
  name: string;
  otherName: string;

  // "1 أيلول 2025 — 15 كانون الثاني 2026" ('' when the dates are unknown)
  period: string;

  isOpen: boolean;

  // When the grades were closed ('' when unknown, or still open).
  closedAt: string;
}


// Step 2 (new year only): every term of the old year must have its grades
// closed before the rollover (navy & gold, 15 Nov 2026).
// A table of the year's terms with the grades as text with a lock (like
// the academic years page). An open term has its own "Close grades"
// button: the page asks with the same dialog as the academic years page,
// closes the grades and loads the preview again. The link to the academic
// years page and "Check again" stay under the table.
@Component({
  selector: 'app-rollover-open-terms',
  imports: [
    NgTemplateOutlet,
    RouterLink,

    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './rollover-open-terms.html',
  styleUrl: './rollover-open-terms.css',
})
export class RolloverOpenTerms {

  private readonly language = inject(Language);

  // Every term of the old year (from GET /api/academicterms), by termNumber.
  readonly yearTerms = input<AcademicTerm[]>([]);

  // From the preview: the terms still open. This list decides,
  // because it is fresher than the terms loaded with the page.
  readonly openTerms = input<RolloverOpenTerm[]>([]);

  readonly fromYearName = input('');

  // A fresh preview is loading ("Check again", or after closing a term).
  readonly isChecking = input(false);

  // The term whose grades are being closed (null = none).
  readonly closingTermId = input<number | null>(null);

  // Under 720px the terms show as a two-line list.
  readonly isPhone = input(false);

  readonly recheck = output<void>();

  // "Close grades" on a term: the page asks first, then closes it.
  readonly closeTerm = output<number>();

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly rows = computed<TermRow[]>(() => {
    const isArabic = this.isArabic();
    const open = this.openTerms();
    const isOpen = (id: number) => open.some(term => term.academicTermId === id);

    const names = (term: { nameAr: string; nameEn: string }) => ({
      name: isArabic ? term.nameAr || term.nameEn : term.nameEn || term.nameAr,
      otherName: isArabic ? term.nameEn : term.nameAr
    });

    const yearTerms = this.yearTerms();

    // Normally all the year's terms are known; if not, only the open ones.
    if (yearTerms.length === 0) {
      return open.map(term => ({
        academicTermId: term.academicTermId,
        ...names(term),
        period: '',
        isOpen: true,
        closedAt: ''
      }));
    }

    return yearTerms.map(term => {
      const termIsOpen = isOpen(term.academicTermId);

      return {
        academicTermId: term.academicTermId,
        ...names(term),
        period: `${formatLongDate(term.startDate, isArabic)} — ${formatLongDate(term.endDate, isArabic)}`,
        isOpen: termIsOpen,
        closedAt: !termIsOpen && term.gradesClosedAt
          ? formatApiDateTimeAsDate(term.gradesClosedAt, isArabic)
          : ''
      };
    });
  });

  readonly openCount = computed(() =>
    this.rows().filter(row => row.isOpen).length
  );
}
