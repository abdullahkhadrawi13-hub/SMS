import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import {
  ClassesSectionsTerm,
  SectionStatusFilter,
  getTermLabel
} from '../../shared/classes-sections-shared';

// Above the sections of a class:
// - "Students in": the term whose student counts are shown (a new request)
// - "Status": all / active / inactive (filtered in the page, no request)
@Component({
  selector: 'app-sections-toolbar',
  imports: [
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './sections-toolbar.html',
  styleUrl: './sections-toolbar.css',
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

  // "First Term · 2026/2027".
  termLabel(term: ClassesSectionsTerm): string {
    return getTermLabel(term, this.isArabic());
  }
}
