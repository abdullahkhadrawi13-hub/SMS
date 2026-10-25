import { Component, computed, inject, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import {
  ClassesSectionsTerm,
  getTermLabel
} from '../../shared/classes-sections-shared';

// Page title and description, and a note saying which term
// the cards' student counts are for.
// Adding a class is done from the "Add academic class" card in the grid.
@Component({
  selector: 'app-classes-header',
  imports: [
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './classes-header.html',
  styleUrl: './classes-header.css',
})
export class ClassesHeader {

  private readonly language = inject(Language);

  // The current term (null = none set, or not loaded yet: no note).
  readonly currentTerm = input<ClassesSectionsTerm | null>(null);

  // "First Term · 2026/2027" in the current language.
  readonly termLabel = computed(() => {
    const term = this.currentTerm();

    return term
      ? getTermLabel(term, this.language.currentDirection() === 'rtl')
      : '';
  });
}
