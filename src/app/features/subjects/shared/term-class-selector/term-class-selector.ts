import { Component, computed, inject, input, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ActiveSectionDto } from '../../../../core/models/section';
import { SchoolClassSimpleDto } from '../../../../core/models/school-class';
import { Language } from '../../../../core/services/language';
import { getTermLabel as formatTermLabel, TermOption } from '../subjects-shared';


// Term / Class / Section fields of the Subjects page, on the page background.
// Used by the "Subject assignments" tab (term, class and section)
// and the "Subject plans" tab (term and class only: showSection = false).
// All data is owned by the parent tab.
@Component({
  selector: 'app-term-class-selector',
  imports: [
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './term-class-selector.html',
  styleUrl: './term-class-selector.css',
})
export class TermClassSelector {

  private readonly language = inject(Language);

  // Every term (the current one is selected by default by the parent).
  readonly terms = input<TermOption[]>([]);
  readonly termsLoading = input(false);
  readonly termId = input<number | null>(null);

  // Active classes only.
  readonly classes = input<SchoolClassSimpleDto[]>([]);
  readonly classId = input<number | null>(null);

  // Active sections of the selected class only.
  readonly sections = input<ActiveSectionDto[]>([]);
  readonly sectionsLoading = input(false);
  readonly sectionId = input<number | null>(null);

  // false in the plans tab (a plan is for the whole class).
  readonly showSection = input(true);

  readonly termChange = output<number>();
  readonly classChange = output<number>();
  readonly sectionChange = output<number>();


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // The <select> gives its value as text: pass on a positive whole number only.
  onTermSelect(value: string): void {
    const id = this.toId(value);

    if (id !== null) {
      this.termChange.emit(id);
    }
  }

  onClassSelect(value: string): void {
    const id = this.toId(value);

    if (id !== null) {
      this.classChange.emit(id);
    }
  }

  onSectionSelect(value: string): void {
    const id = this.toId(value);

    if (id !== null) {
      this.sectionChange.emit(id);
    }
  }


  getTermLabel(term: TermOption): string {
    return formatTermLabel(term, this.isArabic());
  }

  getClassName(c: SchoolClassSimpleDto): string {
    return this.isArabic() ? c.classNameAr : c.classNameEn;
  }

  getSectionName(s: ActiveSectionDto): string {
    return this.isArabic() ? s.sectionAr : s.sectionEn;
  }


  private toId(value: string): number | null {
    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
