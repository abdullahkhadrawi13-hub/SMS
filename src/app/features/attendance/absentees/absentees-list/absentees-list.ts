import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import {
  AbsentStudent,
  AbsentStudentParent,
  AttendanceAbsentees as AttendanceAbsenteesData
} from '../../../../core/models/attendance';
import { getRelationshipTranslationKey } from '../../../../core/models/parent';
import {
  AbsenteeSection,
  formatAttendanceDate
} from '../../shared/attendance-shared';
import { DayBar } from '../../shared/day-bar/day-bar';
import { SearchField } from '../../../../shared/components/search-field/search-field';
import { getFullName, getInitials } from '../../../../shared/utils/person-name';
import { StateCard } from '../../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

// The value of "All sections" in the section list
// (section ids are always above 0).
const ALL_SECTIONS = 0;

// Avatar colours: --avatar-1 ... --avatar-6 (the same as the students table).
const AVATAR_TONES = 6;

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

  // The round avatar: two letters, and one of the six light colours
  // (the same colour as in the students table).
  initials: string;
  avatarTone: number;
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
  selector: 'app-absentees-list',
  imports: [
    RouterLink,

    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    DayBar,
    SearchField,
    StateCard,
    StatusBadge,
  ],
  templateUrl: './absentees-list.html',
  styleUrl: './absentees-list.css',
})
export class AbsenteesList {

  private readonly language = inject(Language);

  readonly allSections = ALL_SECTIONS;

  // ===== Inputs (all data is owned and loaded by the absentees tab) =====

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
  // Kept by the absentees tab, so they stay when the date changes
  // or the user moves to another tab and comes back.
  readonly search = input('');
  readonly section = input<AbsenteeSection | null>(null);

  // Admin and AssistantPrincipal: the student's name opens the student page.
  // (The attendance officer is a teacher and cannot open every student.)
  readonly canOpenStudent = input(false);

  // Admin only: "Link a parent" for a student with no parent.
  readonly canLinkParent = input(false);

  // ===== Outputs (the absentees tab performs the actual actions) =====

  readonly dateChange = output<string>();
  readonly searchChange = output<string>();
  readonly sectionChange = output<AbsenteeSection | null>();

  // Opens the attendance sheet of this section in the record tab.
  readonly openSheet = output<AbsenteeSection>();

  // "Retry" on the error card.
  readonly retry = output<void>();


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

  // (The date field itself is app-day-bar.)

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

  // The class and section names of the selected section
  // (shown in the empty state).
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

      const name = getFullName(student, isArabic);

      group.rows.push({
        student,
        nameParts: this.highlight(name, words),
        numberParts: this.highlight(student.studentNumber, words),
        initials: getInitials(student, isArabic),
        avatarTone: (student.studentId % AVATAR_TONES) + 1,
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

  // The section list is a plain <select>: its value is text.
  onSectionSelect(value: string): void {

    const sectionId = Number(value);

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
