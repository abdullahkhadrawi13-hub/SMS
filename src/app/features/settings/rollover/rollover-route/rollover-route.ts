import { Component, computed, inject, input, output } from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicTerm } from '../../../../core/models/academic-term';
import { Language } from '../../../../core/services/language';

import { RolloverTermOption } from '../rollover';

// The "From term → current term" bar at the top of the page.
// The source term is chosen here; the destination is always the current term.
@Component({
  selector: 'app-rollover-route',
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './rollover-route.html',
  styleUrl: './rollover-route.css',
})
export class RolloverRoute {

  private readonly language = inject(Language);

  // The terms before the current term (newest first).
  readonly options = input<RolloverTermOption[]>([]);

  // The chosen source term.
  readonly sourceTermId = input<number | null>(null);

  // The current term of the school and its year name.
  readonly currentTerm = input.required<AcademicTerm>();
  readonly currentYearName = input('');

  // From the preview: null while it loads (no badge yet).
  readonly isNewYear = input<boolean | null>(null);

  // The source cannot change while the rollover runs or after it ran.
  readonly disabled = input(false);

  readonly sourceChange = output<number>();

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly currentTermName = computed(() => {
    const term = this.currentTerm();

    return this.isArabic() ? term.nameAr : term.nameEn;
  });

  termName(term: AcademicTerm): string {
    return this.isArabic() ? term.nameAr : term.nameEn;
  }
}
