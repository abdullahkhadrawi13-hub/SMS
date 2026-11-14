import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';

import { Language } from '../../../../core/services/language';
import { StatusBadge, StatusBadgeTone } from '../../../../shared/components/status-badge/status-badge';
import { pluralKey } from '../../../../shared/utils/plural';

import { TeacherGradesRow } from '../../shared/dashboard.models';
import { joinNames } from '../../shared/dashboard-names';


// One line of the card, ready for the template.
interface GradesLine {
  id: number;
  section: string;          // "الثامن ب"
  subject: string;          // "الرياضيات"
  isPlanComplete: boolean;
  percent: number;
  doneKey: string;          // "14 من 19 طالبًا"
  doneParams: Record<string, number>;
  tone: StatusBadgeTone;
  stateKey: string;
}


// "علاماتي هذا الفصل" on the Teacher dashboard: one line per section and
// subject the teacher teaches this term, with how many students have every
// mark of the plan entered, and the state of the line:
//   مكتملة          every student has every mark       (green)
//   ناقصة           some marks are missing              (yellow)
//   بانتظار الخطة   the plan is under 100%: no marks    (grey, no progress bar)
//
// For now "فتح الكشف" and "صفوفي" have no action: they get their links
// when the dashboard is connected to the backend.
@Component({
  selector: 'app-teacher-grades-card',
  imports: [
    TranslatePipe,
    MatIconModule,
    StatusBadge,
  ],
  templateUrl: './teacher-grades-card.html',
  styleUrl: './teacher-grades-card.css',
})
export class TeacherGradesCard {

  private readonly language = inject(Language);

  readonly rows = input.required<TeacherGradesRow[]>();

  readonly pluralKey = pluralKey;

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // "الرياضيات" / "Mathematics, Science": the subjects in the card head.
  readonly subjects = computed(() => {
    const isArabic = this.isArabic();
    const names = this.rows().map(row => isArabic ? row.subjectNameAr : row.subjectNameEn);

    return joinNames([...new Set(names)], isArabic);
  });

  readonly lines = computed<GradesLine[]>(() => {
    const isArabic = this.isArabic();

    return this.rows().map(row => {
      const isComplete = row.isPlanComplete && row.completeCount >= row.studentCount;

      return {
        id: row.teacherAssignmentId,
        section: isArabic
          ? `${row.classNameAr} ${row.sectionNameAr}`
          : `${row.classNameEn} ${row.sectionNameEn}`,
        subject: isArabic ? row.subjectNameAr : row.subjectNameEn,
        isPlanComplete: row.isPlanComplete,
        percent: row.studentCount > 0 ? Math.round((row.completeCount / row.studentCount) * 100) : 0,
        doneKey: pluralKey('DASHBOARD.TEACHER.GRADES.DONE', row.studentCount),
        doneParams: { done: row.completeCount, count: row.studentCount },
        tone: !row.isPlanComplete ? 'neutral' : isComplete ? 'ok' : 'warn',
        stateKey: !row.isPlanComplete
          ? 'DASHBOARD.TEACHER.GRADES.STATE_WAITING'
          : isComplete
            ? 'DASHBOARD.TEACHER.GRADES.STATE_COMPLETE'
            : 'DASHBOARD.TEACHER.GRADES.STATE_MISSING',
      };
    });
  });
}
