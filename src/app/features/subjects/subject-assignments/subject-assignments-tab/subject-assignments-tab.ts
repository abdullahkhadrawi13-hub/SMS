import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Subscription } from 'rxjs';

import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { SectionsService } from '../../../../core/services/sections';
import { SubjectPlansService } from '../../../../core/services/subject-plans';
import { SubjectsService } from '../../../../core/services/subjects';
import { TeacherAssignmentsService } from '../../../../core/services/teacher-assignments';
import { ActionResult } from '../../../../shared/services/action-result';
import { SubjectDto } from '../../../../core/models/subject';
import { SubjectPlan } from '../../../../core/models/subject-plan';

import {
  SubjectAssignmentRow,
  SubjectAssignmentsCounts,
  SubjectOption,
  teacherOptionFromAssignment,
} from '../../shared/subjects-shared';
import { SubjectsSelection } from '../../shared/subjects-selection';
import { TermClassSelector } from '../../shared/term-class-selector/term-class-selector';
import {
  SubjectAssignmentsTable,
  MissingPlanSubject,
} from '../subject-assignments-table/subject-assignments-table';
import {
  SubjectAssignmentsForm,
  SubjectAssignmentsFormData,
  SubjectAssignmentsFormResult,
} from '../subject-assignments-form/subject-assignments-form';
import { ActiveSectionDto } from '../../../../core/models/section';
import { TeacherAssignment } from '../../../../core/models/teacher-assignment';


// The "Subject assignments" tab: the subjects of one section in one term
// and their teachers (teacher assignments, SMS API Reference, section 8).
//
// The term and class come from SubjectsSelection (shared with the plans tab),
// the section is chosen here.
//
// GET /api/teacherassignments has no class or section filter:
// the assignments of the whole term are loaded once,
// and the class / section choice filters them here (no new request).
//
// The subject plans of the selected class are loaded too
// (GET /api/subjectplans?academicTermId=&classId=), for:
//   - the "Plan" column of the table
//   - the subjects that have a plan but no teacher in this section
//   - the plan state of each subject in the add form
//     (a subject without a plan cannot be added: the backend answers 400)
@Component({
  selector: 'app-subject-assignments-tab',
  imports: [
    TermClassSelector,
    SubjectAssignmentsTable,
    MatDialogModule,
  ],
  templateUrl: './subject-assignments-tab.html',
  styleUrl: './subject-assignments-tab.css',
})
export class SubjectAssignmentsTab {

  private readonly sectionsService = inject(SectionsService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly plansService = inject(SubjectPlansService);
  private readonly subjectsService = inject(SubjectsService);

  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // The term and class shared with the plans tab.
  readonly selection = inject(SubjectsSelection);


  // Shows the add, edit and activate / deactivate actions (Admin only).
  readonly canManage = input(false);

  // true while this tab is the open tab. The data is loaded only then.
  readonly active = input(false);

  // "Create the plan first" in the add form: the page opens the plans tab
  // and its "New plan" form (for this subject, or none when null).
  readonly createPlan = output<number | null>();


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // =========================
  // Selection: section (term and class are shared)
  // =========================

  readonly sections = signal<ActiveSectionDto[]>([]);
  readonly sectionsLoading = signal(false);
  readonly sectionId = signal<number | null>(null);


  // =========================
  // Data
  // =========================

  // Every assignment of the selected term (all classes and sections).
  readonly assignments = signal<TeacherAssignment[]>([]);

  // The subject plans of the selected term and class.
  readonly plans = signal<SubjectPlan[]>([]);

  // Every subject (used to hide inactive subjects from the "no teacher" line).
  private readonly subjects = signal<SubjectDto[]>([]);

  readonly assignmentsLoading = signal(false);
  readonly errorMessage = signal('');

  // true while the subjects list is loading before the add dialog opens.
  readonly openingForm = signal(false);


  // =========================
  // Table
  // =========================

  // true when a section is chosen (the table is shown).
  readonly hasSelection = computed(
    () => this.selection.termId() !== null
      && this.selection.classId() !== null
      && this.sectionId() !== null
  );

  // The plans by id, to find the plan of each assignment.
  private readonly plansById = computed(
    () => new Map(this.plans().map(p => [p.subjectPlanId, p]))
  );

  // The assignments of the selected section.
  private readonly sectionAssignments = computed(() => {

    if (!this.hasSelection()) {
      return [];
    }

    return this.assignments().filter(a =>
      a.classId === this.selection.classId()
      && a.sectionId === this.sectionId()
    );
  });

  // The subjects of the selected section, sorted by name.
  readonly rows = computed<SubjectAssignmentRow[]>(() => {

    const isArabic = this.isArabic();
    const plansById = this.plansById();

    return this.sectionAssignments()
      .map(assignment => ({
        assignment,
        subjectName: isArabic ? assignment.subjectAr : assignment.subjectEn,
        teacherName: isArabic ? assignment.teacherNameAr : assignment.teacherNameEn,
        teacherInactive: !assignment.isTeacherActive,
        plan: assignment.subjectPlanId === null
          ? null
          : plansById.get(assignment.subjectPlanId) ?? null,
      }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  });

  // Subjects with a plan for this class but no teacher in this section
  // (no assignment at all, active or not). Their students would count as
  // "missing marks" in the rollover, so the table shows them under the rows.
  readonly missingSubjects = computed<MissingPlanSubject[]>(() => {

    if (!this.hasSelection()) {
      return [];
    }

    const isArabic = this.isArabic();

    const assigned = new Set(
      this.sectionAssignments().map(a => a.subjectId)
    );

    const activeSubjects = new Set(
      this.subjects().filter(s => s.isActive).map(s => s.subjectId)
    );

    return this.plans()
      .filter(plan =>
        !assigned.has(plan.subjectId)
        && activeSubjects.has(plan.subjectId)
      )
      .map(plan => ({
        subjectId: plan.subjectId,
        subjectName: isArabic ? plan.subjectAr : plan.subjectEn,
      }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  });

  readonly counts = computed<SubjectAssignmentsCounts>(() => {

    const rows = this.rows();
    const active = rows.filter(r => r.assignment.isActive).length;

    return {
      total: rows.length,
      active,
      inactive: rows.length - active,
    };
  });

  readonly selectedSectionName = computed(() => {

    const section = this.sections().find(
      s => s.sectionId === this.sectionId()
    );

    if (!section) {
      return '';
    }

    return this.isArabic()
      ? section.sectionAr
      : section.sectionEn;
  });


  // Running requests. A new request cancels the previous one,
  // so an old response never replaces a newer selection.
  private sectionsRequest?: Subscription;
  private assignmentsRequest?: Subscription;
  private plansRequest?: Subscription;

  // What is loaded now, so the same data is not loaded twice.
  private sectionsClassId: number | null = null;
  private assignmentsTermId: number | null = null;
  private plansKey: string | null = null;


  constructor() {

    // A new class (chosen here or in the plans tab):
    // its sections are loaded and the section is cleared.
    effect(() => {

      const classId = this.selection.classId();

      untracked(() => {

        if (classId === this.sectionsClassId) {
          return;
        }

        this.sectionsClassId = classId;
        this.sectionId.set(null);
        this.sections.set([]);

        if (classId !== null) {
          this.loadSections(classId);
        }
      });
    });


    // While the tab is open: the assignments of the term (once per term),
    // and the plans of the class (again each time the tab is opened,
    // because the plans tab may have changed them).
    effect(() => {

      const active = this.active();
      const termId = this.selection.termId();
      const classId = this.selection.classId();

      untracked(() => {

        if (!active) {
          this.plansKey = null;
          return;
        }

        if (termId !== null && termId !== this.assignmentsTermId) {
          this.loadAssignments();
        }

        const plansKey = termId !== null && classId !== null
          ? `${termId}-${classId}`
          : null;

        if (plansKey !== this.plansKey) {

          this.plansKey = plansKey;

          if (plansKey === null) {
            this.plans.set([]);
          } else {
            this.loadPlans();
            this.loadSubjects();
          }
        }
      });
    });
  }


  // =========================
  // Loading
  // =========================

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
        },
      });
  }


  // GET /api/teacherassignments?academicTermId=...
  loadAssignments(): void {

    const termId = this.selection.termId();

    if (termId === null) {
      return;
    }

    this.assignmentsTermId = termId;
    this.assignmentsRequest?.unsubscribe();

    this.assignmentsLoading.set(true);
    this.errorMessage.set('');

    this.assignmentsRequest = this.assignmentsService
      .getAssignments({ academicTermId: termId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.assignments.set([]);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );
            this.assignmentsLoading.set(false);
            return;
          }

          this.assignments.set(response.data);
          this.assignmentsLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load section subjects:', error);

          // Loaded again the next time (retry, or another term and back).
          this.assignmentsTermId = null;
          this.assignments.set([]);
          this.errorMessage.set('SUBJECTS.ERROR.LOAD_FAILED');
          this.assignmentsLoading.set(false);
        },
      });
  }


  // GET /api/subjectplans?academicTermId=...&classId=...
  // A failure only empties the "Plan" column (the table still works).
  private loadPlans(): void {

    const termId = this.selection.termId();
    const classId = this.selection.classId();

    if (termId === null || classId === null) {
      return;
    }

    this.plansRequest?.unsubscribe();

    this.plansRequest = this.plansService
      .getPlans({ academicTermId: termId, classId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.plans.set(response.success ? response.data : []);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load subject plans:', error);
          this.plans.set([]);
        },
      });
  }


  // GET /api/subjects (to know which subjects are active).
  private loadSubjects(): void {

    this.subjectsService
      .getSubjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.subjects.set(response.success ? response.data : []);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load subjects:', error);
          this.subjects.set([]);
        },
      });
  }


  // The table's "Retry" button: the terms and classes again when they failed,
  // otherwise the assignments and the plans.
  retry(): void {

    if (this.selection.errorMessage()) {
      this.selection.load(this.selection.termId(), this.selection.classId());
      return;
    }

    this.loadAssignments();
    this.loadPlans();
  }


  // =========================
  // Selection changes
  // =========================

  onTermChange(termId: number): void {
    this.selection.selectTerm(termId);
  }

  // The sections are loaded by the effect above.
  onClassChange(classId: number): void {
    this.selection.selectClass(classId);
  }

  // A new section: no request, the loaded assignments are filtered.
  onSectionChange(sectionId: number): void {
    this.sectionId.set(sectionId);
  }


  // =========================
  // Actions (Admin only)
  // =========================

  // Add a subject to the selected section (POST /api/teacherassignments).
  // The subjects list is loaded fresh each time, so a subject added in the
  // "Subjects list" tab appears here right away.
  // preselectedSubjectId: the subject clicked in the "no teacher" line.
  openAddAssignment(preselectedSubjectId: number | null = null): void {

    const termId = this.selection.termId();
    const classId = this.selection.classId();
    const sectionId = this.sectionId();

    if (
      termId === null
      || classId === null
      || sectionId === null
      || this.openingForm()
    ) {
      return;
    }

    this.openingForm.set(true);

    this.subjectsService
      .getSubjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.openingForm.set(false);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.subjects.set(response.data);

          // The same subject cannot be added twice to the same
          // section and term, so the subjects already added are hidden.
          const usedSubjectIds = new Set(
            this.rows().map(r => r.assignment.subjectId)
          );

          const plansBySubject = new Map(
            this.plans().map(p => [p.subjectId, p])
          );

          const isArabic = this.isArabic();

          // Subjects with a plan first, then the ones without a plan
          // (shown disabled), each group sorted by name.
          const subjects: SubjectOption[] = response.data
            .filter(s => s.isActive && !usedSubjectIds.has(s.subjectId))
            .map(subject => ({
              subject,
              plan: plansBySubject.get(subject.subjectId) ?? null,
            }))
            .sort((a, b) =>
              Number(a.plan === null) - Number(b.plan === null)
              || (isArabic ? a.subject.subjectAr : a.subject.subjectEn)
                .localeCompare(isArabic ? b.subject.subjectAr : b.subject.subjectEn)
            );

          this.openForm({
            mode: 'add',
            academicTermId: termId,
            classId,
            sectionId,
            termLabel: this.selection.selectedTermLabel(),
            className: this.selection.selectedClassName(),
            sectionName: this.selectedSectionName(),
            subjects,
            preselectedSubjectId,
          });
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load subjects:', error);

          this.openingForm.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // Edit the teacher (PUT /api/teacherassignments/{id}).
  openEditAssignment(row: SubjectAssignmentRow): void {

    const assignment = row.assignment;
    const isArabic = this.isArabic();

    this.openForm({
      mode: 'edit',
      academicTermId: assignment.academicTermId,
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      termLabel: this.selection.selectedTermLabel(),
      className: isArabic ? assignment.classNameAr : assignment.classNameEn,
      sectionName: isArabic ? assignment.sectionAr : assignment.sectionEn,
      subjects: [],
      preselectedSubjectId: null,
      assignment,
      // The current teacher is preselected only when still active:
      // an inactive teacher stays out, so the admin must pick another one.
      currentTeacher: assignment.isTeacherActive
        ? teacherOptionFromAssignment(assignment)
        : undefined,
      subjectName: row.subjectName,
      currentTeacherName: row.teacherName || assignment.teacherNumber,
      currentTeacherInactive: row.teacherInactive,
    });
  }


  // Opens the plan details page of the row's subject.
  viewPlan(row: SubjectAssignmentRow): void {

    if (row.assignment.subjectPlanId !== null) {
      this.router.navigate(['/subjects/plans', row.assignment.subjectPlanId]);
    }
  }


  // Activate / deactivate directly, like the rest of the site
  // (PATCH /api/teacherassignments/{id}/status).
  toggleAssignmentStatus(row: SubjectAssignmentRow): void {

    const assignment = row.assignment;

    this.assignmentsService
      .updateAssignmentStatus(assignment.teacherAssignmentId, !assignment.isActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.loadAssignments();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to update section subject status:', error);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // =========================
  // Helpers
  // =========================

  // The form saves the assignment itself and closes with { success: true },
  // or with { createPlanFor: subjectId } when the admin chose
  // "Create the plan first" for a subject without a plan.
  private openForm(data: SubjectAssignmentsFormData): void {

    this.dialog
      .open(SubjectAssignmentsForm, {
        width: '560px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data,
      })
      .afterClosed()
      .subscribe((result?: SubjectAssignmentsFormResult) => {

        if (result?.success) {
          this.loadAssignments();
          this.loadPlans();
        }

        if (result?.createPlanFor !== undefined) {
          this.createPlan.emit(result.createPlanFor);
        }
      });
  }
}
