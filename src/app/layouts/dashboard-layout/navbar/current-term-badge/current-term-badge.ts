import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicTermsService } from '../../../../core/services/academic-terms';
import { AcademicYearsService } from '../../../../core/services/academic-years';
import { Language } from '../../../../core/services/language';
import { AcademicTerm } from '../../../../core/models/academic-term';


// The current term badge in the navbar: "● الفصل الأول 2026/2027".
//
// Data: GET /api/academicterms (the term with isCurrent = true)
// and GET /api/academicyears (the name of its year). No new endpoint.
// Both are read by Admin and AssistantPrincipal only, so the navbar
// creates this badge only for them (Permissions.canViewAcademicYears).
//
// The badge is extra information, never an error:
//   - the terms request fails, or there is no current term → nothing is shown
//   - only the years request fails → the term is shown without the year
@Component({
  selector: 'app-current-term-badge',
  imports: [TranslatePipe],
  templateUrl: './current-term-badge.html',
  styleUrl: './current-term-badge.css',
})
export class CurrentTermBadge {

  private readonly termsService = inject(AcademicTermsService);
  private readonly yearsService = inject(AcademicYearsService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  // The current term (null = no badge).
  private readonly term = signal<AcademicTerm | null>(null);

  // The name of the term's year ("2026/2027"). Empty if it could not be read.
  readonly yearName = signal('');

  // The term name in the UI language. It changes at once with the language.
  readonly termName = computed(() => {
    const term = this.term();

    if (!term) {
      return '';
    }

    return this.language.currentDirection() === 'rtl'
      ? term.nameAr
      : term.nameEn;
  });


  constructor() {
    this.load();
  }


  private load(): void {

    forkJoin({
      terms: this.termsService.getAcademicTerms(),

      // A failed years request only hides the year, not the whole badge.
      years: this.yearsService.getAcademicYears().pipe(
        catchError(() => of(null))
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ terms, years }) => {

          const current = (terms.success ? terms.data : [])
            .find(t => t.isCurrent);

          if (!current) {
            return;
          }

          const year = (years?.success ? years.data : [])
            .find(y => y.academicYearId === current.academicYearId);

          this.yearName.set(year?.yearName ?? '');
          this.term.set(current);
        },

        // No badge and no message: the navbar stays as it is.
        error: () => {
          this.term.set(null);
        }
      });
  }
}