import {
  Component,
  computed,
  inject,
  input,
  ViewContainerRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';

import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { StudentGradesSubject } from '../../../../core/models/student-grades-report';
import { Language } from '../../../../core/services/language';
import { formatNumber } from '../../../subjects/subject';

import { GradeHistoryTarget } from '../../grades';
import { GradeHistory } from '../../grade-history/grade-history';
import { GradeHistorySheet } from '../../grade-history-sheet/grade-history-sheet';
import {
  getSubjectResult,
  RESULT_KEYS,
  StudentGradesViewer,
  SubjectResult,
} from '../student-grades';


// Same breakpoint as the grade sheet: the history opens as a bottom sheet.
const NARROW_SCREEN = '(max-width: 650px)';


// One mark chip, ready to show.
//   mark: '' = not entered yet (a dashed chip). Never shown as 0.
//   history: what the history panel needs (staff only, saved marks only).
interface CardAssessment {
  assessmentId: number;
  name: string;
  mark: string;
  max: string;
  isEdited: boolean;
  history: GradeHistoryTarget | null;
}

interface CardComponent {
  subjectPlanComponentId: number;
  name: string;

  // '' = a mark is still missing ("— of 20").
  score: string;
  weight: string;

  // Width of the bar (0 - 100): score ÷ weight.
  percent: number;

  assessments: CardAssessment[];
}

interface CardView {
  name: string;
  hasTeacher: boolean;
  teacher: string;
  passingMark: string;

  // '' = incomplete ("—").
  total: string;
  result: SubjectResult;

  components: CardComponent[];
}


// One subject of a student in one term (read only).
// Used by the three grade screens (staff tab, student page, parent page).
//
// Header: subject, teacher and passing mark, the total out of 100 and the
// result badge. Then each component: its score of its weight, a thin bar,
// and the assessments as chips ("Quiz 1: 9 of 10").
//
// Staff only (viewer = 'staff'): a history button on each saved mark,
// hidden until the chip is hovered or focused (edited marks too, in blue).
// It opens the same history as the grade sheet: a menu on wide screens,
// a bottom sheet on narrow ones. The GradeHistoryCache comes from the
// parent (StudentGradesTab provides it).
@Component({
  selector: 'app-subject-grades-card',
  imports: [
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslatePipe,
    GradeHistory,
  ],
  templateUrl: './subject-grades-card.html',
  styleUrl: './subject-grades-card.css',
})
export class SubjectGradesCard {

  private readonly language = inject(Language);
  private readonly bottomSheet = inject(MatBottomSheet);

  // Passed to the bottom sheet, so it finds the parent's GradeHistoryCache.
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly isNarrow = toSignal(
    inject(BreakpointObserver)
      .observe(NARROW_SCREEN)
      .pipe(map(state => state.matches)),
    { initialValue: false }
  );


  // ===== Inputs =====

  readonly subject = input.required<StudentGradesSubject>();

  readonly viewer = input<StudentGradesViewer>('portal');

  // Shown at the top of the history panel (staff only).
  readonly studentName = input('');


  readonly resultKeys = RESULT_KEYS;

  readonly showHistory = computed(() => this.viewer() === 'staff');

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  readonly view = computed<CardView>(() => {

    const subject = this.subject();
    const isArabic = this.isArabic();
    const withHistory = this.showHistory();

    const name = (ar: string, en: string) =>
      isArabic ? ar || en : en || ar;

    return {
      name: name(subject.subjectAr, subject.subjectEn),
      hasTeacher: subject.hasTeacher,
      teacher: name(subject.teacherNameAr ?? '', subject.teacherNameEn ?? ''),
      passingMark: formatNumber(subject.passingMark),
      total: formatNumber(subject.total),
      result: getSubjectResult(subject),

      components: subject.components.map(component => {

        const percent = component.score === null || component.weight <= 0
          ? 0
          : Math.min(100, Math.max(0, component.score / component.weight * 100));

        return {
          subjectPlanComponentId: component.subjectPlanComponentId,
          name: name(component.nameAr, component.nameEn),
          score: formatNumber(component.score),
          weight: formatNumber(component.weight),
          percent,

          assessments: component.assessments.map(assessment => {

            const assessmentName = name(assessment.nameAr, assessment.nameEn);
            const max = formatNumber(assessment.maxMark);

            return {
              assessmentId: assessment.assessmentId,
              name: assessmentName,
              mark: formatNumber(assessment.mark),
              max,
              isEdited: assessment.isEdited,
              history: withHistory && assessment.studentGradeId !== null
                ? {
                    studentGradeId: assessment.studentGradeId,
                    studentName: this.studentName(),
                    assessmentName,
                    maxMark: max,
                  }
                : null,
            };
          }),
        };
      }),
    };
  });


  // Narrow screen: the history slides up from the bottom.
  // (On a wide screen the button is a menu trigger and opens the menu itself.)
  openHistory(target: GradeHistoryTarget): void {

    if (!this.isNarrow()) {
      return;
    }

    this.bottomSheet.open<GradeHistorySheet, GradeHistoryTarget>(GradeHistorySheet, {
      data: target,
      panelClass: 'grade-history-sheet',
      direction: this.language.currentDirection(),
      viewContainerRef: this.viewContainerRef,
    });
  }
}
