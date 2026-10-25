import {
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';

import { forkJoin, map, Observable, of, Subscription } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';

import { AcademicTermsService } from '../../../core/services/academic-terms';
import { AcademicYearsService } from '../../../core/services/academic-years';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { Permissions } from '../../../core/services/permissions';
import { SchoolClassesService } from '../../../core/services/school-classes';
import { SectionsService } from '../../../core/services/sections';
import { StudentGradesService } from '../../../core/services/student-grades';
import { TeacherAssignmentsService } from '../../../core/services/teacher-assignments';
import { ActionResult } from '../../../shared/services/action-result';
import { LeaveConfirmation } from '../../../core/guards/unsaved-changes-guard';

import { ActiveSectionDto } from '../../../core/models/section';
import { SchoolClassSimpleDto } from '../../../core/models/school-class';
import {
  BULK_GRADES_LIMIT,
  BulkGradeMark,
  GradeSheet,
} from '../../../core/models/student-grade';
import { TeacherAssignment } from '../../../core/models/teacher-assignment';

import { getTermLabel, TermOption } from '../../subjects/shared/subjects-shared';
import {
  PlanConfirmData,
  PlanConfirmDialog,
} from '../../subjects/subject-plans/plan-confirm-dialog/plan-confirm-dialog';

import {
  getMarkError,
  GradesAssignmentOption,
  GradesDraft,
  GradesDraftStats,
  GradesSelectorMode,
  isSameAsSaved,
  markKey,
  MarkChange,
  parseMark,
} from '../grades';
import { GradesHeader } from '../grades-header/grades-header';
import { GradesSelector } from '../grades-selector/grades-selector';
import {
  GradesEmptyState,
  GradesSheet,
  GradesViewer,
} from '../grades-sheet/grades-sheet';
import { GradesSaveBar } from '../grades-save-bar/grades-save-bar';
import { GradeHistoryCache } from '../grade-history-cache';


// The grades page (parent): one grade sheet = one subject in one section.
// Route: /grades (Admin, Assistant Principal, Teacher).
//
// Choosing the sheet:
//   - Teacher: their own subjects in the current term
//     (GET /api/teacherassignments/mine), one field.
//   - Admin / Assistant Principal: term → class → section → subject.
//     GET /api/teacherassignments has no class or section filter, so the
//     active assignments of the whole term are loaded once and filtered here.
//
// The sheet (SMS API Reference, section 10):
//   - GET  /api/studentgrades/sheet?teacherAssignmentId=  loads it
//   - POST /api/studentgrades/bulk saves every changed mark in one request;
//     its response holds the new sheet, so the page redraws from it.
//
// The marks typed on the screen stay in the draft until they are saved.
// While there are unsaved marks:
//   - the fields of the selector are locked,
//   - leaving the page asks first (unsavedChangesGuard + canLeave()),
//   - closing or refreshing the tab asks the browser's question (beforeunload).
//
// The choice is kept in the address, so a refresh opens the same sheet:
//   teacher: /grades?assignmentId=12
//   staff:   /grades?termId=3&classId=1&sectionId=2&assignmentId=12
//
// A closed term (areGradesClosed, set by the Admin on the academic years page):
// the backend answers canEnterGrades = false, so the sheet is read-only and
// shows why. The term list marks the closed terms before one is chosen.
//
// GradeHistoryCache: the history of each mark, kept while one sheet is open
// (cleared when another sheet is loaded and after a save).
@Component({
  selector: 'app-grades-page',
  imports: [
    GradesHeader,
    GradesSelector,
    GradesSheet,
    GradesSaveBar,
  ],
  providers: [
    GradeHistoryCache,
  ],
  templateUrl: './grades-page.html',
  styleUrl: './grades-page.css',
})
export class GradesPage implements OnInit, LeaveConfirmation {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly permissions = inject(Permissions);
  private readonly language = inject(Language);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);

  private readonly termsService = inject(AcademicTermsService);
  private readonly yearsService = inject(AcademicYearsService);
  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly gradesService = inject(StudentGradesService);
  private readonly historyCache = inject(GradeHistoryCache);


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // =========================
  // Role
  // =========================

  readonly mode = computed<GradesSelectorMode>(
    () => this.permissions.isTeacher() ? 'teacher' : 'staff'
  );

  readonly viewer = computed<GradesViewer>(() => {

    if (this.permissions.isAdmin()) {
      return 'admin';
    }

    return this.permissions.isTeacher() ? 'teacher' : 'assistant';
  });

  readonly subtitleKey = computed(() => {

    switch (this.viewer()) {
      case 'teacher': return 'GRADES.HEADER.SUBTITLE_TEACHER';
      case 'admin': return 'GRADES.HEADER.SUBTITLE_ADMIN';
      default: return 'GRADES.HEADER.SUBTITLE_ASSISTANT';
    }
  });


  // =========================
  // Selection lists (staff)
  // =========================

  // Every term, newest first.
  readonly terms = signal<TermOption[]>([]);
  readonly termsLoading = signal(false);

  // Active classes only.
  readonly classes = signal<SchoolClassSimpleDto[]>([]);

  // Active sections of the selected class.
  readonly sections = signal<ActiveSectionDto[]>([]);
  readonly sectionsLoading = signal(false);

  readonly termId = signal<number | null>(null);
  readonly classId = signal<number | null>(null);
  readonly sectionId = signal<number | null>(null);


  // =========================
  // Subjects (both modes)
  // =========================

  // Teacher: their own assignments (current term).
  // Staff: the active assignments of the selected term (every class and section).
  readonly assignments = signal<TeacherAssignment[]>([]);
  readonly assignmentsLoading = signal(false);

  // Teacher: true once "mine" answered (to show "You have no subjects").
  private readonly assignmentsLoaded = signal(false);

  readonly assignmentId = signal<number | null>(null);

  // The choices of the subject field.
  readonly assignmentOptions = computed<GradesAssignmentOption[]>(() => {

    const isArabic = this.isArabic();

    if (this.mode() === 'teacher') {

      return this.assignments()
        .map(a => ({
          teacherAssignmentId: a.teacherAssignmentId,
          label: isArabic
            ? `${a.subjectAr} · ${a.classNameAr} / ${a.sectionAr}`
            : `${a.subjectEn} · ${a.classNameEn} / ${a.sectionEn}`,
          teacherName: '',
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    const classId = this.classId();
    const sectionId = this.sectionId();

    if (classId === null || sectionId === null) {
      return [];
    }

    return this.assignments()
      .filter(a => a.classId === classId && a.sectionId === sectionId)
      .map(a => ({
        teacherAssignmentId: a.teacherAssignmentId,
        label: isArabic ? a.subjectAr : a.subjectEn,
        teacherName: isArabic ? a.teacherNameAr : a.teacherNameEn,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  // Teacher: the name of the current term (from their assignments).
  readonly currentTermName = computed(() => {

    const first = this.assignments()[0];

    if (!first || this.mode() !== 'teacher') {
      return '';
    }

    return this.isArabic()
      ? first.academicTermNameAr
      : first.academicTermNameEn;
  });

  // The term shown under the sheet's title.
  readonly sheetTermName = computed(() => {

    if (this.mode() === 'teacher') {
      return this.currentTermName();
    }

    const term = this.terms().find(t => t.academicTermId === this.termId());

    return term ? getTermLabel(term, this.isArabic()) : '';
  });


  // =========================
  // Sheet
  // =========================

  readonly sheet = signal<GradeSheet | null>(null);
  readonly sheetLoading = signal(false);

  // A loading error (lists or sheet). Shown in place of the sheet.
  readonly errorMessage = signal('');

  // What "Try again" loads again after an error.
  private retryAction: () => void = () => this.loadSheet();

  readonly draft = signal<GradesDraft>({});
  readonly saving = signal(false);

  // true = the marks can be typed: Admin or the owning teacher,
  // the plan's weights add up to 100 and the term's grades are open
  // (canEnterGrades from the sheet).
  readonly editable = computed(
    () => this.permissions.canEnterGrades()
      && (this.sheet()?.canEnterGrades ?? false)
  );

  readonly emptyState = computed<GradesEmptyState>(
    () => this.mode() === 'teacher'
      && this.assignmentsLoaded()
      && this.assignments().length === 0
        ? 'no-assignments'
        : 'select'
  );

  // The saved mark and the max mark of each cell, to check the draft.
  private readonly savedMarks = computed(() => {

    const marks = new Map<string, number | null>();

    for (const student of this.sheet()?.students ?? []) {
      for (const mark of student.marks) {
        marks.set(markKey(student.studentId, mark.assessmentId), mark.mark);
      }
    }

    return marks;
  });

  private readonly maxMarks = computed(
    () => new Map(
      (this.sheet()?.assessments ?? []).map(a => [a.assessmentId, a.maxMark])
    )
  );

  readonly draftStats = computed<GradesDraftStats>(() => {

    const entries = Object.entries(this.draft());

    const invalid = entries.filter(([key, text]) => {

      const assessmentId = Number(key.split('-')[1]);
      const saved = this.savedMarks().get(key) ?? null;
      const max = this.maxMarks().get(assessmentId) ?? 0;

      return getMarkError(text, saved, max) !== null;
    }).length;

    return { changes: entries.length, invalid };
  });

  readonly hasChanges = computed(() => this.draftStats().changes > 0);


  // Starts writing the address once the first choice is restored.
  private readonly urlReady = signal(false);

  // Running requests. A new request cancels the previous one,
  // so an old response never replaces a newer choice.
  private sectionsRequest?: Subscription;
  private assignmentsRequest?: Subscription;
  private sheetRequest?: Subscription;


  constructor() {

    // Keep the address up to date (replaceUrl: no new history entry per choice).
    effect(() => {

      if (!this.urlReady()) {
        return;
      }

      const queryParams = this.mode() === 'teacher'
        ? { assignmentId: this.assignmentId() }
        : {
          termId: this.termId(),
          classId: this.classId(),
          sectionId: this.sectionId(),
          assignmentId: this.assignmentId(),
        };

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        replaceUrl: true,
      });
    });
  }


  ngOnInit(): void {

    if (this.mode() === 'teacher') {
      this.loadMyAssignments();
    } else {
      this.loadStaffLists();
    }
  }


  // =========================
  // Leaving with unsaved marks
  // =========================

  // Called by unsavedChangesGuard before the router leaves the page.
  canLeave(): boolean | Observable<boolean> {

    if (!this.hasChanges()) {
      return true;
    }

    return this.dialog
      .open<PlanConfirmDialog, PlanConfirmData, boolean>(PlanConfirmDialog, {
        data: {
          icon: 'edit_note',
          titleKey: 'GRADES.LEAVE.TITLE',
          messageKey: 'GRADES.LEAVE.MESSAGE',
          messageParams: { count: this.draftStats().changes },
          confirmKey: 'GRADES.LEAVE.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .pipe(map(confirmed => confirmed === true));
  }

  // Closing or refreshing the tab: the browser asks its own question.
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {

    if (this.hasChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }


  // =========================
  // Teacher: my subjects
  // =========================

  // GET /api/teacherassignments/mine (current term).
  // The subject from the address is chosen again; with one subject only,
  // it is chosen right away.
  private loadMyAssignments(): void {

    const initialId = this.readId('assignmentId');

    this.assignmentsLoading.set(true);
    this.errorMessage.set('');
    this.retryAction = () => this.loadMyAssignments();

    this.assignmentsService
      .getMyAssignments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.assignmentsLoading.set(false);

          if (!response.success) {
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            return;
          }

          this.assignments.set(response.data);
          this.assignmentsLoaded.set(true);

          const ids = response.data.map(a => a.teacherAssignmentId);

          const chosen = initialId !== null && ids.includes(initialId)
            ? initialId
            : ids.length === 1 ? ids[0] : null;

          this.urlReady.set(true);

          if (chosen !== null) {
            this.onAssignmentChange(chosen);
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load my subjects:', error);
          this.assignmentsLoading.set(false);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // =========================
  // Staff: term → class → section → subject
  // =========================

  // The terms (with their year names) and the active classes,
  // then the choice from the address (or the current term).
  private loadStaffLists(): void {

    const initial = {
      termId: this.readId('termId'),
      classId: this.readId('classId'),
      sectionId: this.readId('sectionId'),
      assignmentId: this.readId('assignmentId'),
    };

    this.termsLoading.set(true);
    this.errorMessage.set('');
    this.retryAction = () => this.loadStaffLists();

    forkJoin({
      terms: this.termsService.getAcademicTerms(),
      years: this.yearsService.getAcademicYears(),
      classes: this.classesService.getActiveSchoolClasses(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ terms, years, classes }) => {

          this.termsLoading.set(false);

          const yearNames = new Map(
            (years.success ? years.data : [])
              .map(y => [y.academicYearId, y.yearName])
          );

          // Newest term first.
          const options: TermOption[] = (terms.success ? terms.data : [])
            .map(t => ({
              academicTermId: t.academicTermId,
              nameAr: t.nameAr,
              nameEn: t.nameEn,
              yearName: yearNames.get(t.academicYearId) ?? '',
              startDate: t.startDate,
              isCurrent: t.isCurrent,
              areGradesClosed: t.areGradesClosed,
            }))
            .sort((a, b) => b.startDate.localeCompare(a.startDate));

          const activeClasses = classes.success ? classes.data : [];

          this.terms.set(options);
          this.classes.set(activeClasses);

          const term =
            options.find(t => t.academicTermId === initial.termId)
            ?? options.find(t => t.isCurrent)
            ?? options[0];

          const schoolClass = activeClasses.find(
            c => c.schoolClassId === initial.classId
          );

          this.termId.set(term?.academicTermId ?? null);
          this.classId.set(schoolClass?.schoolClassId ?? null);

          this.restoreStaffChoice(initial.sectionId, initial.assignmentId);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load terms and classes:', error);
          this.termsLoading.set(false);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }

  // The section and subject from the address: their lists are loaded
  // together, then they are chosen when they still exist.
  private restoreStaffChoice(
    sectionId: number | null,
    assignmentId: number | null
  ): void {

    const termId = this.termId();
    const classId = this.classId();

    this.sectionsLoading.set(classId !== null);
    this.assignmentsLoading.set(termId !== null);

    forkJoin({
      sections: classId !== null
        ? this.sectionsService.getActiveSectionsByClass(classId)
        : of(null),
      assignments: termId !== null
        ? this.assignmentsService.getAssignments({ academicTermId: termId, isActive: true })
        : of(null),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sections, assignments }) => {

          this.sectionsLoading.set(false);
          this.assignmentsLoading.set(false);

          this.sections.set(sections?.success ? sections.data : []);
          this.assignments.set(assignments?.success ? assignments.data : []);

          if (this.sections().some(s => s.sectionId === sectionId)) {
            this.sectionId.set(sectionId);
          }

          this.urlReady.set(true);

          const exists = this.assignmentOptions().some(
            o => o.teacherAssignmentId === assignmentId
          );

          if (assignmentId !== null && exists) {
            this.onAssignmentChange(assignmentId);
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load sections or subjects:', error);
          this.sectionsLoading.set(false);
          this.assignmentsLoading.set(false);
          this.urlReady.set(true);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
          this.retryAction = () => this.restoreStaffChoice(sectionId, assignmentId);
        },
      });
  }


  onTermChange(termId: number): void {

    this.termId.set(termId);

    // The class and section stay (they do not depend on the term),
    // the subject is chosen again from the new term's subjects.
    this.assignmentId.set(null);
    this.clearSheet();

    this.loadTermAssignments(termId);
  }

  onClassChange(classId: number): void {

    this.classId.set(classId);

    this.sectionId.set(null);
    this.sections.set([]);
    this.assignmentId.set(null);
    this.clearSheet();

    this.loadSections(classId);
  }

  onSectionChange(sectionId: number): void {

    this.sectionId.set(sectionId);

    this.assignmentId.set(null);
    this.clearSheet();
  }

  // Both modes: a subject was chosen → its sheet.
  onAssignmentChange(assignmentId: number): void {

    this.assignmentId.set(assignmentId);
    this.loadSheet();
  }


  // GET /api/sections/active-by-class/{classId}
  private loadSections(classId: number): void {

    this.sectionsRequest?.unsubscribe();
    this.sectionsLoading.set(true);

    this.sectionsRequest = this.sectionsService
      .getActiveSectionsByClass(classId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.sections.set(response.success ? response.data : []);
          this.sectionsLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load sections:', error);
          this.sections.set([]);
          this.sectionsLoading.set(false);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
          this.retryAction = () => {
            this.errorMessage.set('');
            this.loadSections(classId);
          };
        },
      });
  }

  // GET /api/teacherassignments?academicTermId=&isActive=true
  private loadTermAssignments(termId: number): void {

    this.assignmentsRequest?.unsubscribe();
    this.assignments.set([]);
    this.assignmentsLoading.set(true);

    this.assignmentsRequest = this.assignmentsService
      .getAssignments({ academicTermId: termId, isActive: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.assignmentsLoading.set(false);

          if (!response.success) {
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            this.retryAction = () => this.loadTermAssignments(termId);
            return;
          }

          this.assignments.set(response.data);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the term subjects:', error);
          this.assignmentsLoading.set(false);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
          this.retryAction = () => {
            this.errorMessage.set('');
            this.loadTermAssignments(termId);
          };
        },
      });
  }


  // =========================
  // Sheet
  // =========================

  // GET /api/studentgrades/sheet?teacherAssignmentId=
  loadSheet(): void {

    const assignmentId = this.assignmentId();

    this.sheetRequest?.unsubscribe();
    this.errorMessage.set('');
    this.retryAction = () => this.loadSheet();

    if (assignmentId === null) {
      this.clearSheet();
      return;
    }

    this.sheet.set(null);
    this.draft.set({});
    this.historyCache.clear();
    this.sheetLoading.set(true);

    this.sheetRequest = this.gradesService
      .getSheet(assignmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.sheetLoading.set(false);

          if (!response.success || !response.data) {
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            return;
          }

          this.sheet.set(response.data);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the grade sheet:', error);
          this.sheetLoading.set(false);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }

  private clearSheet(): void {
    this.sheetRequest?.unsubscribe();
    this.sheet.set(null);
    this.draft.set({});
    this.sheetLoading.set(false);
    this.errorMessage.set('');
  }

  retry(): void {
    this.errorMessage.set('');
    this.retryAction();
  }


  // =========================
  // Typing and saving marks
  // =========================

  // A cell stays in the draft only while its text differs from the saved mark.
  onMarkChange(change: MarkChange): void {

    const key = markKey(change.studentId, change.assessmentId);
    const saved = this.savedMarks().get(key) ?? null;

    this.draft.update(draft => {

      const next = { ...draft };

      if (isSameAsSaved(change.text, saved)) {
        delete next[key];
      } else {
        next[key] = change.text;
      }

      return next;
    });
  }

  // Back to the saved marks.
  resetChanges(): void {
    this.draft.set({});
  }

  // POST /api/studentgrades/bulk: every changed mark in one request.
  // All or nothing: when one row is wrong the backend saves nothing,
  // and the typed marks stay on the screen to fix them.
  saveSheet(): void {

    const sheet = this.sheet();
    const stats = this.draftStats();

    if (!sheet || this.saving() || stats.changes === 0 || stats.invalid > 0) {
      return;
    }

    if (stats.changes > BULK_GRADES_LIMIT) {
      this.actionResult.show(
        'warning',
        this.translate.instant('GRADES.SAVE.TOO_MANY', { max: BULK_GRADES_LIMIT })
      );
      return;
    }

    const marks: BulkGradeMark[] = Object.entries(this.draft()).map(([key, text]) => {

      const [studentId, assessmentId] = key.split('-').map(Number);

      return {
        studentId,
        assessmentId,
        mark: parseMark(text, this.maxMarks().get(assessmentId) ?? 0) as number,
      };
    });

    this.saving.set(true);

    this.gradesService
      .saveBulk({ teacherAssignmentId: sheet.teacherAssignmentId, marks })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.saving.set(false);

          if (!response.success || !response.data) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          // The new sheet: saved marks, totals, results and the plan's lock.
          this.sheet.set(response.data.sheet);
          this.draft.set({});

          // A changed mark has a new history row: load it again when opened.
          this.historyCache.clear();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
            || this.translate.instant('GRADES.SAVE.SUCCESS')
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to save the grade sheet:', error);
          this.saving.set(false);
          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // A positive whole number from the address, or null.
  private readId(name: string): number | null {

    const id = Number(this.route.snapshot.queryParamMap.get(name));

    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
