import { Component, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { StudentGradesTerm } from '../../../../core/models/student-grades-report';
import { Language } from '../../../../core/services/language';

import { SubjectGradesCard } from '../subject-grades-card/subject-grades-card';
import {
  countSubjects,
  getClassSectionParams,
  getRecordStatusMessage,
  isActiveRecord,
  StudentGradesViewer,
} from '../student-grades';


// The grades of one term: the counters, a note, and one card per subject.
// The same content for the three screens; only the frame around it differs.
//
//   staff (the "Grades" tab of the student details):
//     toolbar:  counters  ·  the term field (projected: [termSelect])
//     below:    class and section chip, "grades are closed" chip, note
//   portal (the student's and the parent's pages):
//     one box:  counters  ·  note
//     (the class chip and the term are in the page header)
//
// A record that is not active (withdrawn, graduated, moved to another
// school): the backend sends no subjects, so a message replaces the
// counters and the cards (one per status for the staff, one general
// message for the student and the parent).
@Component({
  selector: 'app-term-grades',
  imports: [
    NgTemplateOutlet,
    MatIconModule,
    TranslatePipe,
    SubjectGradesCard,
  ],
  templateUrl: './term-grades.html',
  styleUrl: './term-grades.css',
})
export class TermGrades {

  private readonly language = inject(Language);


  // ===== Inputs =====

  readonly term = input.required<StudentGradesTerm>();

  readonly viewer = input<StudentGradesViewer>('portal');

  // Shown at the top of a mark's history (staff only).
  readonly studentName = input('');


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly isStaff = computed(() => this.viewer() === 'staff');

  readonly isActive = computed(() => isActiveRecord(this.term()));

  readonly counts = computed(() => countSubjects(this.term().subjects));

  readonly classSection = computed(
    () => getClassSectionParams(this.term(), this.isArabic())
  );

  readonly statusMessage = computed(
    () => getRecordStatusMessage(this.term().studentStatus, this.viewer())
  );

  readonly noteKey = computed(() =>
    this.isStaff()
      ? 'STUDENT_GRADES.NOTE_STAFF'
      : 'STUDENT_GRADES.NOTE_PORTAL'
  );
}
