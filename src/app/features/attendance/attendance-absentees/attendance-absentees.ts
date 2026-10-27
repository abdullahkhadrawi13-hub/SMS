import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../core/services/language';
import {
  AbsentStudent,
  AbsentStudentParent,
  AttendanceAbsentees as AttendanceAbsenteesData
} from '../../../core/models/attendance';
import { getRelationshipTranslationKey } from '../../../core/models/parent';
import {
  AbsenteeSection,
  formatAttendanceDate,
  fromApiDate,
  toApiDate
} from '../attendance';

// The value of "All sections" in the section list.
// (Section ids are always above 0. null is not used, because mat-select
// treats a null option as "nothing selected".)
const ALL_SECTIONS = 0;

// A piece of text, marked when it matches the search (shown in <mark>).
interface TextPart {
  text: string;
  match: boolean;
}

// One section in the section list, with its number of absent students.
interface SectionOption {
  section: AbsenteeSection;
  name: string;
  count: number;
}

// The sections of one class in the section list.
interface ClassOption {
  classId: number;
  name: string;
  sections: SectionOption[];
}

// One parent row (a phone to call).
interface ParentRow {
  parent: AbsentStudentParent;
  name: string;
  relationshipKey: string;
}

// One absent student row.
interface StudentRow {
  student: AbsentStudent;
  nameParts: TextPart[];
  numberParts: TextPart[];
  initial: string;
  parents: ParentRow[];
}

// The absent students of one section.
interface SectionGroup {
  section: AbsenteeSection;
  className: string;
  sectionName: string;
  rows: StudentRow[];
}

@Component({
  selector: 'app-attendance-absentees',
  imports: [
    RouterLink,

    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './attendance-absentees.html',
  styleUrl: './attendance-absentees.css',
})
export class AttendanceAbsentees {

  private readonly language = inject(Language);

  readonly allSections = ALL_SECTIONS;

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // The answer of GET /api/attendance/absentees (null = nothing loaded).
  readonly absentees = input<AttendanceAbsenteesData | null>(null);

  // Dates use the API format: YYYY-MM-DD.
  readonly date = input.required<string>();
  readonly maxDate = input.required<string>();

  // True for the attendance officer (my-access -> todayOnly: true):
  // today only, so no date picker is shown.
  readonly todayOnly = input(false);

  readonly loading = input(false);

  // Error message text (already in the current language).
  readonly errorMessage = input<string | null>(null);

  // The search text and the selected section (null = all sections).
  // Kept by the parent page, so they stay when the user changes tabs.
  readonly search = input('');
  readonly section = input<AbsenteeSection | null>(null);

  // Admin and AssistantPrincipal: the student's name opens the student page.
  // (The attendance officer is a teacher and cannot open every student.)
  readonly canOpenStudent = input(false);

  // Admin only: "Link a parent" for a student with no parent.
  readonly canLinkParent = input(false);

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly dateChange = output<string>();
  readonly searchChange = output<string>();
  readonly sectionChange = output<AbsenteeSection | null>();

  // Opens the attendance sheet of this section in the record tab.
  readonly openSheet = output<AbsenteeSection>();


  // ===== Loading modes (the same as the daily summary) =====

  // First load: nothing on the screen yet, so the big spinner shows.
  readonly isInitialLoading = computed(() =>
    this.loading() && this.absentees() === null
  );

  // Reload (another date, or the tab opened again): the old list stays
  // on the screen with a thin progress bar on top, so nothing jumps.
  readonly isRefreshing = computed(() =>
    this.loading() && this.absentees() !== null
  );


  // ===== Date =====

  // The date picker works with Date objects.
  readonly dateValue = computed(() => fromApiDate(this.date()));
  readonly maxDateValue = computed(() => fromApiDate(this.maxDate()));

  readonly isToday = computed(() => this.date() === this.maxDate());

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly displayDate = computed(() =>
    formatAttendanceDate(this.date(), this.isArabic())
  );


  // ===== Numbers =====

  readonly students = computed(() => this.absentees()?.students ?? []);

  readonly totalAbsent = computed(() => this.students().length);

  readonly withoutParentCount = computed(() =>
    this.students().filter(student => student.parents.length === 0).length
  );


  // ===== Section list =====

  // The sections that have absent students on this date, grouped by class
  // (in the order of the API: class, then section).
  // The selected section always stays in the list, with 0 when it has
  // no absent students on this date.
  readonly classOptions = computed<ClassOption[]>(() => {

    const classes: ClassOption[] = [];

    const addSection = (section: AbsenteeSection, absent: boolean): void => {

      let classOption = classes.find(c => c.classId === section.classId);

      if (!classOption) {
        classOption = {
          classId: section.classId,
          name: this.getClassName(section),
          sections: []
        };

        classes.push(classOption);
      }

      let sectionOption = classOption.sections.find(
        s => s.section.sectionId === section.sectionId
      );

      if (!sectionOption) {
        sectionOption = {
          section,
          name: this.getSectionName(section),
          count: 0
        };

        classOption.sections.push(sectionOption);
      }

      if (absent) {
        sectionOption.count++;
      }
    };

    for (const student of this.students()) {
      addSection(this.toSection(student), true);
    }

    const selected = this.section();

    if (selected) {
      addSection(selected, false);
    }

    return classes;
  });

  // The value of the section list (ALL_SECTIONS = all sections).
  readonly selectValue = computed(
    () => this.section()?.sectionId ?? ALL_SECTIONS
  );

  // The class and section names of the selected section
  // (shown in the closed section list and in the empty state).
  readonly selectedNames = computed(() => {

    const section = this.section();

    return section
      ? {
          className: this.getClassName(section),
          sectionName: this.getSectionName(section)
        }
      : null;
  });


  // ===== Filtering (search + section, done here: the API has no filters) =====

  // The search words. Every word must match (in any order),
  // the same as the search of the students page.
  private readonly words = computed(() =>
    this.search()
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0)
  );

  readonly isSearching = computed(() => this.words().length > 0);

  // The absent students of the selected section (or of all sections).
  readonly inSection = computed(() => {

    const section = this.section();

    return section
      ? this.students().filter(s => s.sectionId === section.sectionId)
      : this.students();
  });

  // ...that also match the search.
  readonly shownStudents = computed(() => {

    const words = this.words();

    return words.length === 0
      ? this.inSection()
      : this.inSection().filter(student => this.matches(student, words));
  });

  // The shown students, one group per section.
  readonly groups = computed<SectionGroup[]>(() => {

    const groups: SectionGroup[] = [];
    const words = this.words();
    const isArabic = this.isArabic();

    for (const student of this.shownStudents()) {

      let group = groups.find(g => g.section.sectionId === student.sectionId);

      if (!group) {
        const section = this.toSection(student);

        group = {
          section,
          className: this.getClassName(section),
          sectionName: this.getSectionName(section),
          rows: []
        };

        groups.push(group);
      }

      const name = this.getStudentName(student, isArabic);

      group.rows.push({
        student,
        nameParts: this.highlight(name, words),
        numberParts: this.highlight(student.studentNumber, words),
        initial: name.charAt(0),
        parents: student.parents.map(parent => ({
          parent,
          name: isArabic
            ? `${parent.firstNameAr} ${parent.familyNameAr}`
            : `${parent.firstNameEn} ${parent.familyNameEn}`,
          relationshipKey: getRelationshipTranslationKey(parent.relationship)
        }))
      });
    }

    return groups;
  });


  // ===== Empty states =====

  // A section is selected and has no absent students on this date.
  readonly isSectionEmpty = computed(() =>
    this.section() !== null && this.inSection().length === 0
  );

  // The day has no absent students at all.
  readonly isDayEmpty = computed(() =>
    this.section() === null && this.students().length === 0
  );

  // There are absent students, but none matches the search.
  readonly isSearchEmpty = computed(() =>
    this.inSection().length > 0 && this.shownStudents().length === 0
  );


  // ===== Actions =====

  onDateChange(value: Date | null): void {

    if (!value) {
      return;
    }

    this.dateChange.emit(toApiDate(value));
  }

  goToToday(): void {
    this.dateChange.emit(this.maxDate());
  }

  onSearchInput(value: string): void {
    this.searchChange.emit(value);
  }

  clearSearch(): void {
    this.searchChange.emit('');
  }

  onSectionSelect(sectionId: number): void {

    if (sectionId === ALL_SECTIONS) {
      this.sectionChange.emit(null);
      return;
    }

    const option = this.classOptions()
      .flatMap(c => c.sections)
      .find(s => s.section.sectionId === sectionId);

    this.sectionChange.emit(option ? option.section : null);
  }

  showAllSections(): void {
    this.sectionChange.emit(null);
  }


  // ===== Helpers =====

  private toSection(student: AbsentStudent): AbsenteeSection {
    return {
      classId: student.classId,
      classNameAr: student.classNameAr,
      classNameEn: student.classNameEn,
      sectionId: student.sectionId,
      sectionAr: student.sectionAr,
      sectionEn: student.sectionEn
    };
  }

  private getClassName(section: AbsenteeSection): string {
    return this.isArabic()
      ? section.classNameAr || section.classNameEn
      : section.classNameEn || section.classNameAr;
  }

  private getSectionName(section: AbsenteeSection): string {
    return this.isArabic()
      ? section.sectionAr || section.sectionEn
      : section.sectionEn || section.sectionAr;
  }

  // The four-part name in the current language.
  private getStudentName(student: AbsentStudent, isArabic: boolean): string {

    const parts = isArabic
      ? [student.firstNameAr, student.fatherNameAr, student.grandFatherNameAr, student.familyNameAr]
      : [student.firstNameEn, student.fatherNameEn, student.grandFatherNameEn, student.familyNameEn];

    return parts.filter(Boolean).join(' ');
  }

  // Every word must be part of the student number
  // or of one of the name parts (Arabic or English).
  private matches(student: AbsentStudent, words: string[]): boolean {

    const fields = [
      student.studentNumber,
      student.firstNameAr,
      student.fatherNameAr,
      student.grandFatherNameAr,
      student.familyNameAr,
      student.firstNameEn,
      student.fatherNameEn,
      student.grandFatherNameEn,
      student.familyNameEn
    ].map(field => (field ?? '').toLowerCase());

    return words.every(word => fields.some(field => field.includes(word)));
  }

  // Splits the text into parts, marking the parts that match a search word.
  private highlight(text: string, words: string[]): TextPart[] {

    if (words.length === 0 || !text) {
      return [{ text, match: false }];
    }

    const lower = text.toLowerCase();
    const marked = new Array<boolean>(text.length).fill(false);

    for (const word of words) {

      let index = lower.indexOf(word);

      while (index !== -1) {
        marked.fill(true, index, index + word.length);
        index = lower.indexOf(word, index + word.length);
      }
    }

    const parts: TextPart[] = [];

    for (let i = 0; i < text.length; i++) {

      const last = parts[parts.length - 1];

      if (last && last.match === marked[i]) {
        last.text += text[i];
      } else {
        parts.push({ text: text[i], match: marked[i] });
      }
    }

    return parts;
  }

}
