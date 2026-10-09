import { Component, computed, inject, input, output } from '@angular/core';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../core/services/language';
import { ActiveSectionDto } from '../../../core/services/sections';
import { SchoolClassSimpleDto } from '../../classes/school-class';
import { fromApiDate, toApiDate } from '../attendance';

@Component({
  selector: 'app-attendance-selector',
  imports: [
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './attendance-selector.html',
  styleUrl: './attendance-selector.css',
})
export class AttendanceSelector {

  private readonly language = inject(Language);

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // Active classes only.
  readonly classes = input<SchoolClassSimpleDto[]>([]);

  // Active sections of the selected class only.
  readonly sections = input<ActiveSectionDto[]>([]);

  // True while the sections of the selected class are being loaded.
  readonly sectionsLoading = input(false);

  // Current selection.
  readonly classId = input<number | null>(null);
  readonly sectionId = input<number | null>(null);

  // Dates use the API format: YYYY-MM-DD.
  readonly date = input.required<string>();
  readonly maxDate = input.required<string>();

  // True while the sheet has unsaved changes or is being saved.
  // The selection cannot be changed then, so nothing is lost by mistake.
  readonly locked = input(false);

  // ===== Outputs (the parent page loads the data) =====

  readonly classChange = output<number | null>();
  readonly sectionChange = output<number | null>();
  readonly dateChange = output<string>();

  // The date picker works with Date objects.
  readonly dateValue = computed(() => fromApiDate(this.date()));
  readonly maxDateValue = computed(() => fromApiDate(this.maxDate()));

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  onDateChange(value: Date | null): void {

    if (!value) {
      return;
    }

    this.dateChange.emit(toApiDate(value));
  }


  // Display names (Arabic / English)
  getClassName(schoolClass: SchoolClassSimpleDto): string {
    return this.isArabic()
      ? schoolClass.classNameAr
      : schoolClass.classNameEn;
  }

  getSectionName(section: ActiveSectionDto): string {
    return this.isArabic()
      ? section.sectionAr
      : section.sectionEn;
  }

}
