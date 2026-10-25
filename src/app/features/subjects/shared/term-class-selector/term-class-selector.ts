import { Component, input, output } from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { ActiveSectionDto } from '../../../../core/models/section';
import { SchoolClassSimpleDto } from '../../../../core/models/school-class';
import { getTermLabel as formatTermLabel, TermOption } from '../subjects-shared';


// Term / Class / Section dropdowns of the Subjects page.
// Used by the "Subject assignments" tab (term, class and section)
// and the "Subject plans" tab (term and class only: showSection = false).
// All data is owned by the parent tab.
@Component({
  selector: 'app-term-class-selector',
  imports: [
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './term-class-selector.html',
  styleUrl: './term-class-selector.css',
})
export class TermClassSelector {

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


  isArabic(): boolean {
    return document.documentElement.lang === 'ar';
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
}
