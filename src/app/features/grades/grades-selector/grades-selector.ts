import {
  Component,
  computed,
  inject,
  input,
  output,
  OutputEmitterRef,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../core/services/language';

import { ActiveSectionDto } from '../../../core/models/section';
import { SchoolClassSimpleDto } from '../../../core/models/school-class';
import { getTermLabel as formatTermLabel, TermOption } from '../../subjects/shared/subjects-shared';

import { GradesAssignmentOption, GradesSelectorMode } from '../grades';


// The fields that choose which grade sheet is shown.
//
// teacher mode: one field "Class and subject" (the teacher's own subjects
//   in the current term). The current term itself is in the navbar and
//   under the sheet's title.
// staff mode (Admin, Assistant Principal): term → class → section → subject.
//   Each field is enabled after the one before it is chosen, and a
//   disabled field says what to choose first.
//
// The fields are plain <select> elements with the shared field look
// (styles.css, "Form fields"), on the page background above the sheet.
//
// All data is owned by the parent page.
// locked: the fields cannot change while marks are not saved
// (the parent shows "Save or undo your changes first").
@Component({
  selector: 'app-grades-selector',
  imports: [
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './grades-selector.html',
  styleUrl: './grades-selector.css',
})
export class GradesSelector {

  private readonly language = inject(Language);

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

  // Staff mode: a section is chosen but it has no subjects.
  readonly noSubjects = computed(
    () => this.sectionId() !== null
      && !this.assignmentsLoading()
      && this.assignments().length === 0
  );


  // A <select> gives its value as text; the empty choice is ignored
  // (a field never goes back to "nothing chosen" by itself).
  onSelect(target: OutputEmitterRef<number>, value: string): void {

    if (value !== '') {
      target.emit(Number(value));
    }
  }


  isArabic(): boolean {
    return this.language.currentDirection() === 'rtl';
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
