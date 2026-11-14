import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { pluralKey } from '../../../../shared/utils/plural';

import { StudentSubjectRow, SubjectResult } from '../../shared/dashboard.models';


// One line of the card, ready for the template.
interface SubjectLine {
  id: number;
  name: string;
  enteredKey: string;              // "3 من 4 تقييمات"
  enteredParams: Record<string, number>;
  total: number | null;
  result: SubjectResult;
  resultKey: string;
}

const RESULT_KEYS: Record<SubjectResult, string> = {
  passed: 'DASHBOARD.STUDENT.GRADES.PASSED',
  failed: 'DASHBOARD.STUDENT.GRADES.FAILED',
  incomplete: 'DASHBOARD.STUDENT.GRADES.INCOMPLETE',
};


// "علاماتي هذا الفصل" on the Student dashboard: one line per subject with
// the assessments entered, the total out of 100 ("—" while incomplete,
// spec: كشف العلامات → المجموع) and the result (the shared .result-badge
// of the grade sheet, styles.css).
//
// For now "كل علاماتي" has no action: it gets its link (/grades) when the
// dashboard is connected to the backend.
@Component({
  selector: 'app-student-grades-card',
  imports: [TranslatePipe],
  templateUrl: './student-grades-card.html',
  styleUrl: './student-grades-card.css',
})
export class StudentGradesCard {

  private readonly language = inject(Language);

  readonly subjects = input.required<StudentSubjectRow[]>();

  readonly pluralKey = pluralKey;

  readonly lines = computed<SubjectLine[]>(() => {
    const isArabic = this.language.currentDirection() === 'rtl';

    return this.subjects().map(subject => ({
      id: subject.subjectId,
      name: isArabic ? subject.nameAr : subject.nameEn,
      enteredKey: pluralKey('DASHBOARD.STUDENT.GRADES.ENTERED', subject.assessmentCount),
      enteredParams: { entered: subject.enteredCount, count: subject.assessmentCount },
      total: subject.total,
      result: subject.result,
      resultKey: RESULT_KEYS[subject.result],
    }));
  });
}
