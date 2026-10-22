import { Component, computed, input, output } from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { ActiveSectionDto } from '../../../core/models/section';
import { SchoolClassSimpleDto } from '../../../core/models/school-class';
import { getTermLabel as formatTermLabel, TermOption } from '../../subjects/subject';

import { GradesAssignmentOption, GradesSelectorMode } from '../grades';


// The fields that choose which grade sheet is shown.
//
// teacher mode: one field "Class and subject" (the teacher's own subjects
//   in the current term) + the current term, read-only.
// staff mode (Admin, Assistant Principal): term → class → section → subject.
//   Each field is enabled after the one before it is chosen.
//
// All data is owned by the parent page.
// locked: the fields cannot change while marks are not saved
// (the parent shows "Save or undo your changes first").
@Component({
  selector: 'app-grades-selector',
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './grades-selector.html',
  styleUrl: './grades-selector.css',
})
export class GradesSelector {

  readonly mode = input.required<GradesSelectorMode>();

  // ===== Staff mode =====

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

  // ===== Both modes =====

  // The subjects that can be chosen (staff: of the selected section).
  readonly assignments = input<GradesAssignmentOption[]>([]);
  readonly assignmentsLoading = input(false);
  readonly assignmentId = input<number | null>(null);

  // Teacher mode: the name of the current term (shown read-only).
  readonly currentTermName = input('');

  // true while marks are not saved: every field is disabled.
  readonly locked = input(false);


  readonly termChange = output<number>();
  readonly classChange = output<number>();
  readonly sectionChange = output<number>();
  readonly assignmentChange = output<number>();


  // The teacher of the chosen subject (shown under the subject field, staff mode).
  readonly selectedTeacherName = computed(
    () => this.assignments().find(
      a => a.teacherAssignmentId === this.assignmentId()
    )?.teacherName ?? ''
  );

  // Staff mode: the chosen term (shown by the term field's mat-select-trigger).
  readonly selectedTerm = computed(
    () => this.terms().find(t => t.academicTermId === this.termId()) ?? null
  );

  // Staff mode: a section is chosen but it has no subjects.
  readonly noSubjects = computed(
    () => this.sectionId() !== null
      && !this.assignmentsLoading()
      && this.assignments().length === 0
  );


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
