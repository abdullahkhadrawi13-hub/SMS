import { Component, computed, inject, input, output } from '@angular/core';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { ActiveSectionDto } from '../../../../core/models/section';
import { SchoolClassSimpleDto } from '../../../../core/models/school-class';
import {
  formatAttendanceDate,
  fromApiDate,
  toApiDate
} from '../../shared/attendance-shared';
import { AttendanceDaysOff } from '../../shared/attendance-days-off';

// The three fields above the attendance sheet: class, section and date.
// It only shows the selection and reports changes; the record tab owns
// the data (and keeps the selection in the URL).
//
// The school's weekly days off (AttendanceDaysOff, from the page) are grey
// in the calendar but can still be picked; when the chosen date is a day
// off, a note under the fields says so (22 Nov 2026).
@Component({
  selector: 'app-record-selector',
  imports: [
    MatDatepickerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './record-selector.html',
  styleUrl: './record-selector.css',
})
export class RecordSelector {

  private readonly language = inject(Language);
  private readonly daysOff = inject(AttendanceDaysOff);

  // ===== Inputs (all data is owned and loaded by the record tab) =====

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

  // True for the attendance officer (my-access -> todayOnly: true):
  // the date is locked to today and no date picker is shown.
  readonly todayOnly = input(false);

  // True while the sheet has unsaved changes or is being saved.
  // The selection cannot be changed then, so nothing is lost by mistake.
  readonly locked = input(false);

  // ===== Outputs (the record tab loads the data) =====

  readonly classChange = output<number | null>();
  readonly sectionChange = output<number | null>();
  readonly dateChange = output<string>();

  // The date picker works with Date objects.
  readonly dateValue = computed(() => fromApiDate(this.date()));
  readonly maxDateValue = computed(() => fromApiDate(this.maxDate()));

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // [dateClass] of the calendar: the days off are grey.
  readonly dateClass = this.daysOff.dateClass;

  // The note when the chosen date is a known day off. Its wording follows
  // the date, not the role: "اليوم الجمعة، وهو عطلة…" for today,
  // "الجمعة عطلة أسبوعية…" for an earlier day.
  readonly dayOffNote = computed(() => {
    const day = this.daysOff.dayOff(this.date());

    if (day === null) {
      return null;
    }

    return {
      key: this.date() === this.maxDate()
        ? 'ATTENDANCE.RECORD_SELECTOR.DAY_OFF_TODAY'
        : 'ATTENDANCE.RECORD_SELECTOR.DAY_OFF_PAST',
      dayKey: `SCHOOL_INFO.DAYS.${day}`,
    };
  });

  // The locked date as text: "السبت، 10/10/2026" or "Saturday, 10/10/2026".
  readonly displayDate = computed(() =>
    formatAttendanceDate(this.date(), this.isArabic())
  );


  // The two lists are plain <select> elements: their value is text.
  // "" is the first line ("Choose a class" / "Choose a section").
  onClassSelect(value: string): void {
    this.classChange.emit(value === '' ? null : Number(value));
  }

  onSectionSelect(value: string): void {
    this.sectionChange.emit(value === '' ? null : Number(value));
  }

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
