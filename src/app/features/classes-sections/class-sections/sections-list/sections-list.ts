import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TranslatePipe } from '@ngx-translate/core';

import { PHONE_QUERY } from '../../../../layouts/dashboard-layout/dashboard-layout';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { Language } from '../../../../core/services/language';
import { pluralKey } from '../../../../shared/utils/plural';
import { StateCard } from '../../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { SectionStatusFilter, isEmptySection } from '../../shared/classes-sections-shared';


// One row of the list: what the table (or the phone list) shows for a section.
interface SectionRowView {
  section: Section;
  // "أ" / "A": the small box at the start.
  letter: string;
  // "شعبة أ" in the UI language, "Section A" in the other one.
  name: string;
  otherName: string;
  otherNameDir: 'ltr' | 'rtl';
  // The bar's width in percent (100% = the biggest section of the class).
  barWidth: number;
  isEmpty: boolean;
  studentsKey: string;
  // /students?classId=..&sectionId=.. : the students of this section.
  studentsQuery: { classId: number; sectionId: number };
}


// The sections of a class in a table card (spec: الجداول):
//   Section · Students (a gold bar + the number) · Status · ⋮
// On the phone the table becomes a list of two-line items.
//
// The section's name is a link to the students page, already filtered
// on this class and section (/students?classId=..&sectionId=..).
//
// It also shows the loading, error and empty states, inside the card.
// Display only: the page owns and loads the data,
// and every action goes up as an output.
@Component({
  selector: 'app-sections-list',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    TranslatePipe,
    StateCard,
    StatusBadge,
  ],
  templateUrl: './sections-list.html',
  styleUrl: './sections-list.css',
})
export class SectionsList {

  private readonly language = inject(Language);

  // true when the screen is narrower than 720px (same as the layout).
  private readonly breakpoints = inject(BreakpointObserver);

  readonly isPhone = toSignal(
    this.breakpoints.observe(PHONE_QUERY).pipe(map(result => result.matches)),
    { initialValue: this.breakpoints.isMatched(PHONE_QUERY) }
  );


  // ===== Inputs =====

  // The sections to show (already filtered by status).
  readonly sections = input<Section[]>([]);

  // How many sections the class has before the status filter.
  readonly totalCount = input(0);

  readonly statusFilter = input<SectionStatusFilter>('all');

  readonly schoolClass = input.required<SchoolClass>();

  // The biggest student count in the class (the rows' bars).
  readonly maxStudentCount = input(1);

  readonly isLoading = input(false);

  // Error message (translation key or API message) shown instead of the rows.
  readonly errorMessage = input('');

  // Shows the rows' actions (Admin only).
  readonly canManage = input(false);

  // The Admin can add a section here (the empty state says how).
  readonly canAdd = input(false);

  // id of the section whose status is being changed right now.
  readonly togglingSectionId = input<number | null>(null);


  // ===== Outputs =====

  readonly retry = output<void>();

  readonly editSection = output<Section>();

  readonly toggleStatus = output<Section>();

  // "Show all sections" after a status filter left nothing to show.
  readonly showAll = output<void>();


  // ===== Loading modes =====

  // First load: nothing on the screen yet, a spinner inside the card.
  readonly isInitialLoading = computed(
    () => this.isLoading() && this.sections().length === 0
  );

  // Reload (term change, after add / edit / activate): the old rows stay
  // with a thin bar on top, so nothing jumps.
  readonly isRefreshing = computed(
    () => this.isLoading() && this.sections().length > 0
  );

  // The class has sections, but none match the status filter.
  readonly isFilteredEmpty = computed(
    () => this.sections().length === 0
      && this.totalCount() > 0
      && this.statusFilter() !== 'all'
  );


  // ===== Rows =====

  readonly rows = computed<SectionRowView[]>(() => {
    const isArabic = this.language.currentDirection() === 'rtl';
    const max = Math.max(1, this.maxStudentCount());
    const classId = this.schoolClass().schoolClassId;

    return this.sections().map(section => ({
      section,
      letter: isArabic ? section.sectionAr : section.sectionEn,
      name: isArabic ? section.sectionAr : section.sectionEn,
      otherName: isArabic ? section.sectionEn : section.sectionAr,
      otherNameDir: isArabic ? 'ltr' : 'rtl',
      barWidth: Math.round(section.studentCount / max * 100),
      isEmpty: isEmptySection(section),
      studentsKey: pluralKey('CLASSES.COUNTS.STUDENTS', section.studentCount),
      studentsQuery: { classId, sectionId: section.sectionId }
    }));
  });

  // "شعبة أ" in the UI language, "Section A" in the other one.
  readonly nameKey = computed(() =>
    this.language.currentDirection() === 'rtl'
      ? 'CLASS_SECTIONS.ROW.NAME_AR'
      : 'CLASS_SECTIONS.ROW.NAME_EN'
  );

  readonly otherNameKey = computed(() =>
    this.language.currentDirection() === 'rtl'
      ? 'CLASS_SECTIONS.ROW.NAME_EN'
      : 'CLASS_SECTIONS.ROW.NAME_AR'
  );
}
