import { Component, input, output } from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { ActiveSectionDto } from '../../../../core/services/sections';
import { SchoolClassSimpleDto } from '../../../../core/models/school-class';
import { getTermLabel as formatTermLabel, TermOption } from '../../subject';


// Term / Class / Section dropdowns of the "Class subjects" tab.
// All data is owned by the parent (class-subjects).
@Component({
  selector: 'app-class-subjects-selector',
  imports: [
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './class-subjects-selector.html',
  styleUrl: './class-subjects-selector.css',
})
export class ClassSubjectsSelector {

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
