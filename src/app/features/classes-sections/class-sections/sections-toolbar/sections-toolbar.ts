import { Component, computed, inject, input, output } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import {
  ClassesSectionsTerm,
  SectionStatusFilter,
  getTermLabel
} from '../../shared/classes-sections-shared';


// Above the sections of a class, two lists in the shared look
// (styles.css → "List page": .list-filters, .filter-select):
// - Term: the term whose student counts are shown (a new request)
// - Status: all / active / inactive (filtered in the page, no request)
// A list that is not on its default (another term, a status) is blue.
@Component({
  selector: 'app-sections-toolbar',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './sections-toolbar.html',
  host: { class: 'list-filters' }
})
export class SectionsToolbar {

  private readonly language = inject(Language);


  // ===== Inputs =====

  // Every term with its year name, newest first.
  readonly terms = input<ClassesSectionsTerm[]>([]);

  readonly selectedTermId = input<number | null>(null);

  readonly statusFilter = input<SectionStatusFilter>('all');


  // ===== Outputs =====

  readonly termChange = output<number>();

  readonly statusChange = output<SectionStatusFilter>();


  // The status options, in the order they are shown.
  readonly statusOptions: { value: SectionStatusFilter; label: string }[] = [
    { value: 'all', label: 'CLASS_SECTIONS.TOOLBAR.STATUS_ALL' },
    { value: 'active', label: 'CLASS_SECTIONS.TOOLBAR.STATUS_ACTIVE' },
    { value: 'inactive', label: 'CLASS_SECTIONS.TOOLBAR.STATUS_INACTIVE' }
  ];

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // A term other than the current one is chosen.
  readonly isOtherTerm = computed(() => {
    const selected = this.terms().find(t => t.academicTermId === this.selectedTermId());

    return !!selected && !selected.isCurrent;
  });

  // "First Term · 2026/2027".
  termLabel(term: ClassesSectionsTerm): string {
    return getTermLabel(term, this.isArabic());
  }

  onTermChange(value: string): void {
    const id = Number(value);

    if (id) {
      this.termChange.emit(id);
    }
  }

  onStatusChange(value: string): void {
    this.statusChange.emit(value as SectionStatusFilter);
  }
}
