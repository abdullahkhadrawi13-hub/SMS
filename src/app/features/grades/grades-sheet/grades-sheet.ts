import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  ViewContainerRef,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';

import { map } from 'rxjs';

import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../core/services/language';
import { GradeSheet, GradeSheetMark } from '../../../core/models/student-grade';
import {
  componentColor,
  FULL_WEIGHT,
  formatNumber,
  PLAN_STATUS_BADGE,
  PlanStatus,
  sortComponents,
} from '../../subjects/shared/subjects-shared';

import {
  getMarkError,
  GradeHistoryTarget,
  GradesDraft,
  GradesSheetCounts,
  markKey,
  MarkCellState,
  MarkChange,
  SheetColumn,
  SheetColumnGroup,
  SheetRow,
} from '../grades';
import { GradeHistory } from '../grade-history/grade-history';
import { GradeHistorySheet } from '../grade-history-sheet/grade-history-sheet';


// Who is looking at the sheet (changes the notes above the table).
export type GradesViewer = 'admin' | 'assistant' | 'teacher';

// What to show when there is no sheet yet.
// - select:         nothing chosen yet
// - no-assignments: the teacher has no subjects in the current term
export type GradesEmptyState = 'select' | 'no-assignments';

// One note above the table.
// closed = the term's grades are closed (grey, with a bold title line).
interface SheetNote {
  tone: 'info' | 'warn' | 'closed';
  icon: string;
  key: string;
  titleKey?: string;
  params?: Record<string, string>;
}

// Up to this width the history opens as a bottom sheet instead of a menu
// (the same width the other pages switch to their phone layout).
const NARROW_SCREEN = '(max-width: 650px)';


// The grade sheet: title, counters, notes and the marks table.
//
// Columns: one group per plan component (its color and weight on top),
// one column per assessment under it, then the total (out of 100) and the result.
// Rows: the students actively enrolled in the section.
//
// The total and the result come from the backend (saved marks only):
// they change after "Save sheet", not while typing.
//
// editable = true: each mark is an input. The typed text goes to the parent
// (markChange), which keeps it in the draft until it is saved.
// The sheet only shows the draft: yellow = changed, red = not allowed.
//
// Every saved mark has a small history button in its corner
// (always visible on an edited mark, on row hover for the others).
// It opens the mark's history: a menu on wide screens, a bottom sheet on
// narrow ones. The history can be read even when the term's grades are closed.
@Component({
  selector: 'app-grades-sheet',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslatePipe,
    GradeHistory,
  ],
  templateUrl: './grades-sheet.html',
  styleUrl: './grades-sheet.css',
})
export class GradesSheet {

  private readonly language = inject(Language);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly bottomSheet = inject(MatBottomSheet);

  // Passed to the bottom sheet, so it can use the page's GradeHistoryCache.
  private readonly viewContainerRef = inject(ViewContainerRef);

  // true on a narrow screen: the history opens as a bottom sheet.
  readonly isNarrow = toSignal(
    inject(BreakpointObserver)
      .observe(NARROW_SCREEN)
      .pipe(map(state => state.matches)),
    { initialValue: false }
  );


  // ===== Inputs (the data is owned by the parent page) =====

  readonly sheet = input<GradeSheet | null>(null);

  // The marks typed and not saved yet.
  readonly draft = input<GradesDraft>({});

  // true = the marks can be typed (Admin or the owning teacher,
  // the plan's weights add up to 100, and the term's grades are open).
  readonly editable = input(false);

  readonly viewer = input.required<GradesViewer>();

  // "First Term · 2026/2027" (shown under the title).
  readonly termName = input('');

  readonly loading = input(false);
  readonly saving = input(false);
  readonly errorMessage = input('');

  readonly emptyState = input<GradesEmptyState>('select');


  // ===== Outputs =====

  readonly markChange = output<MarkChange>();

  // "Try again" after a loading error.
  readonly retry = output<void>();


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // =========================
  // Title
  // =========================

  readonly title = computed(() => {

    const sheet = this.sheet();

    if (!sheet) {
      return '';
    }

    const isArabic = this.isArabic();

    const subject = isArabic ? sheet.subjectAr : sheet.subjectEn;
    const className = isArabic ? sheet.classNameAr : sheet.classNameEn;
    const section = isArabic ? sheet.sectionAr : sheet.sectionEn;

    return `${subject} · ${className} / ${section}`;
  });

  readonly passingMark = computed(() => {
    const mark = this.sheet()?.passingMark;
    return mark === null || mark === undefined ? '' : formatNumber(mark);
  });

  // The plan's state badge (same badges as the Subjects page).
  // "ready" is about the weights only: canEnterGrades is also false when
  // the term's grades are closed, so it cannot tell a complete plan here.
  readonly planBadge = computed(() => {

    const sheet = this.sheet();

    if (!sheet || sheet.subjectPlanId === null) {
      return null;
    }

    const status: PlanStatus = sheet.isPlanLocked
      ? 'locked'
      : sheet.totalWeight === FULL_WEIGHT ? 'ready' : 'incomplete';

    return PLAN_STATUS_BADGE[status];
  });


  // =========================
  // Columns and rows
  // =========================

  readonly groups = computed<SheetColumnGroup[]>(() => {

    const sheet = this.sheet();

    if (!sheet) {
      return [];
    }

    const isArabic = this.isArabic();

    return sortComponents(sheet.components).map((component, index) => ({
      component,
      name: isArabic ? component.nameAr : component.nameEn,
      color: componentColor(index),

      // The sheet already returns the assessments grouped and sorted.
      assessments: sheet.assessments
        .filter(a => a.subjectPlanComponentId === component.subjectPlanComponentId)
        .map<SheetColumn>(assessment => ({
          assessment,
          name: isArabic ? assessment.nameAr : assessment.nameEn,
        })),
    }));
  });

  readonly rows = computed<SheetRow[]>(() => {

    const sheet = this.sheet();

    if (!sheet) {
      return [];
    }

    const isArabic = this.isArabic();

    return sheet.students.map(student => ({
      student,
      name: isArabic ? student.studentNameAr : student.studentNameEn,
      savedMarks: new Map(
        student.marks.map(m => [m.assessmentId, m.mark])
      ),
      savedCells: new Map(
        student.marks.map(m => [m.assessmentId, m])
      ),
    }));
  });

  // The students that have unsaved marks (their total is shown faded).
  private readonly changedStudents = computed(() => {

    const ids = new Set<number>();

    for (const key of Object.keys(this.draft())) {
      ids.add(Number(key.split('-')[0]));
    }

    return ids;
  });

  // From the saved results of the backend.
  readonly counts = computed<GradesSheetCounts>(() => {

    const students = this.sheet()?.students ?? [];

    const passed = students.filter(s => s.isPassed === true).length;
    const failed = students.filter(s => s.isPassed === false).length;

    return {
      total: students.length,
      passed,
      failed,
      incomplete: students.length - passed - failed,
    };
  });


  // =========================
  // Notes above the table
  // =========================

  readonly notes = computed<SheetNote[]>(() => {

    const sheet = this.sheet();

    if (!sheet) {
      return [];
    }

    const viewer = this.viewer();
    const notes: SheetNote[] = [];

    // The term's grades are closed: this comes first and replaces the plan
    // and read-only notes (nobody can change anything in this term).
    if (sheet.areGradesClosed) {

      notes.push({
        tone: 'closed',
        icon: 'event_busy',
        titleKey: 'GRADES.SHEET.NOTES.GRADES_CLOSED_TITLE',
        key: viewer === 'admin'
          ? 'GRADES.SHEET.NOTES.GRADES_CLOSED_ADMIN'
          : 'GRADES.SHEET.NOTES.GRADES_CLOSED',
      });

      return notes;
    }

    // No plan, or the weights are not 100: no marks can be entered.
    if (sheet.subjectPlanId === null) {

      notes.push({
        tone: 'warn',
        icon: 'rule',
        key: viewer === 'admin'
          ? 'GRADES.SHEET.NOTES.NO_PLAN_ADMIN'
          : 'GRADES.SHEET.NOTES.NO_PLAN',
      });

    } else if (!sheet.canEnterGrades) {

      notes.push({
        tone: 'warn',
        icon: 'warning_amber',
        key: viewer === 'admin'
          ? 'GRADES.SHEET.NOTES.INCOMPLETE_PLAN_ADMIN'
          : 'GRADES.SHEET.NOTES.INCOMPLETE_PLAN',
        params: { weight: formatNumber(sheet.totalWeight) },
      });
    }

    // Assistant Principal: read-only.
    if (viewer === 'assistant') {
      notes.push({
        tone: 'info',
        icon: 'visibility',
        key: 'GRADES.SHEET.NOTES.READ_ONLY',
      });
    }

    // Open components with no assessment yet: no total for any student.
    const emptyOpen = this.groups()
      .filter(g => g.component.teacherAddsAssessments && g.assessments.length === 0)
      .map(g => g.name);

    if (sheet.canEnterGrades && emptyOpen.length > 0) {
      notes.push({
        tone: 'info',
        icon: 'info',
        key: viewer === 'teacher'
          ? 'GRADES.SHEET.NOTES.OPEN_EMPTY_TEACHER'
          : 'GRADES.SHEET.NOTES.OPEN_EMPTY_STAFF',
        params: { names: emptyOpen.join(this.isArabic() ? '، ' : ', ') },
      });
    }

    return notes;
  });


  // =========================
  // Cells
  // =========================

  // The text in a cell: the typed text, otherwise the saved mark.
  cellText(row: SheetRow, column: SheetColumn): string {

    const typed = this.draft()[markKey(row.student.studentId, column.assessment.assessmentId)];

    if (typed !== undefined) {
      return typed;
    }

    return formatNumber(row.savedMarks.get(column.assessment.assessmentId));
  }

  cellState(row: SheetRow, column: SheetColumn): MarkCellState {

    const typed = this.draft()[markKey(row.student.studentId, column.assessment.assessmentId)];

    if (typed === undefined) {
      return 'saved';
    }

    const saved = row.savedMarks.get(column.assessment.assessmentId) ?? null;

    return getMarkError(typed, saved, column.assessment.maxMark) === null
      ? 'changed'
      : 'invalid';
  }

  // The tooltip of a cell that cannot be saved (translation key, or '').
  cellErrorKey(row: SheetRow, column: SheetColumn): string {

    const typed = this.draft()[markKey(row.student.studentId, column.assessment.assessmentId)];

    if (typed === undefined) {
      return '';
    }

    const saved = row.savedMarks.get(column.assessment.assessmentId) ?? null;
    const error = getMarkError(typed, saved, column.assessment.maxMark);

    if (error === 'range') {
      return 'GRADES.SHEET.CELL.RANGE_ERROR';
    }

    return error === 'clear' ? 'GRADES.SHEET.CELL.CLEAR_ERROR' : '';
  }

  savedMark(row: SheetRow, column: SheetColumn): string {
    return formatNumber(row.savedMarks.get(column.assessment.assessmentId));
  }

  hasChanges(row: SheetRow): boolean {
    return this.changedStudents().has(row.student.studentId);
  }

  formatTotal(total: number | null): string {
    return formatNumber(total);
  }

  formatMax(value: number): string {
    return formatNumber(value);
  }


  // =========================
  // A mark's history
  // =========================

  // The saved cell when it has a mark (only a saved mark has a history).
  historyCell(row: SheetRow, column: SheetColumn): GradeSheetMark | null {

    const cell = row.savedCells.get(column.assessment.assessmentId);

    return cell && cell.studentGradeId !== null ? cell : null;
  }

  // What the history panel shows at its top.
  historyTarget(row: SheetRow, column: SheetColumn): GradeHistoryTarget | null {

    const cell = this.historyCell(row, column);

    if (!cell) {
      return null;
    }

    return {
      studentGradeId: cell.studentGradeId as number,
      studentName: row.name,
      assessmentName: column.name,
      maxMark: formatNumber(column.assessment.maxMark),
    };
  }

  // Narrow screen: the history slides up from the bottom.
  // (On a wide screen the button is a menu trigger and opens the menu itself.)
  openHistory(row: SheetRow, column: SheetColumn): void {

    if (!this.isNarrow()) {
      return;
    }

    const target = this.historyTarget(row, column);

    if (!target) {
      return;
    }

    this.bottomSheet.open<GradeHistorySheet, GradeHistoryTarget>(GradeHistorySheet, {
      data: target,
      panelClass: 'grade-history-sheet',
      direction: this.language.currentDirection(),
      viewContainerRef: this.viewContainerRef,
    });
  }


  onInput(row: SheetRow, column: SheetColumn, event: Event): void {

    this.markChange.emit({
      studentId: row.student.studentId,
      assessmentId: column.assessment.assessmentId,
      text: (event.target as HTMLInputElement).value,
    });
  }


  // Enter or ↓: the same assessment of the next student. ↑: the previous one.
  // (Quick for typing a whole column, e.g. the final exam of the class.)
  onKeydown(event: KeyboardEvent, column: SheetColumn): void {

    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const inputs = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLInputElement>(
        `input[data-assessment="${column.assessment.assessmentId}"]`
      )
    );

    const index = inputs.indexOf(event.target as HTMLInputElement);
    const next = inputs[index + (event.key === 'ArrowUp' ? -1 : 1)];

    if (next) {
      next.focus();
      next.select();
    }
  }
}
