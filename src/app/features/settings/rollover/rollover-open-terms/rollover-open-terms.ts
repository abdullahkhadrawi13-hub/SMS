import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicTerm } from '../../../../core/models/academic-term';
import { RolloverOpenTerm } from '../../../../core/models/rollover';
import { Language } from '../../../../core/services/language';


// One term of the old year, open or closed.
interface TermRow {
  academicTermId: number;
  name: string;
  isOpen: boolean;
}


// Step 2 (new year only): every term of the old year must have its grades
// closed before the rollover. The terms are closed on the academic years
// page; "Check again" asks the backend for a fresh preview.
@Component({
  selector: 'app-rollover-open-terms',
  imports: [
    RouterLink,

    MatButtonModule,
    MatIconModule,
    TranslatePipe
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

  // A fresh preview is loading ("Check again").
  readonly isChecking = input(false);

  readonly recheck = output<void>();

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly rows = computed<TermRow[]>(() => {
    const open = this.openTerms();
    const isOpen = (id: number) => open.some(term => term.academicTermId === id);

    const name = (term: { nameAr: string; nameEn: string }) =>
      this.isArabic() ? term.nameAr : term.nameEn;

    const yearTerms = this.yearTerms();

    // Normally all the year's terms are known; if not, only the open ones.
    if (yearTerms.length === 0) {
      return open.map(term => ({
        academicTermId: term.academicTermId,
        name: name(term),
        isOpen: true
      }));
    }

    return yearTerms.map(term => ({
      academicTermId: term.academicTermId,
      name: name(term),
      isOpen: isOpen(term.academicTermId)
    }));
  });
}
