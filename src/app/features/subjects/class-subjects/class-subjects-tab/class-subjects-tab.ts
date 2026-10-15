import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { forkJoin, Subscription } from 'rxjs';

import { AcademicTermsService } from '../../../../core/services/academic-terms';
import { AcademicYearsService } from '../../../../core/services/academic-years';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { SchoolClassesService } from '../../../../core/services/school-classes';
import {
  ActiveSectionDto,
  SectionsService,
} from '../../../../core/services/sections';
import { SubjectsService } from '../../../../core/services/subjects';
import {
  TeacherAssignment,
  TeacherAssignmentsService,
} from '../../../../core/services/teacher-assignments';
import {
  TeacherListDto,
  TeachersService,
} from '../../../../core/services/teachers';
import { ActionResult } from '../../../../shared/services/action-result';
import { SchoolClassSimpleDto } from '../../../../core/models/school-class';

import {
  ClassSubjectRow,
  ClassSubjectsCounts,
  getTeacherFullName,
  getTermLabel,
  TermOption,
} from '../../subject';
import { ClassSubjectsSelector } from '../class-subjects-selector/class-subjects-selector';
import { ClassSubjectsTable } from '../class-subjects-table/class-subjects-table';
import {
  AssignmentForm,
  AssignmentFormData,
} from '../assignment-form/assignment-form';


// The largest page the teachers API returns (API Reference, section 5).
const TEACHERS_PAGE_SIZE = 100;


// The "Class subjects" tab: the subjects of one section in one term
// (teacher assignments, SMS API Reference, section 8).
//
// GET /api/teacherassignments has no class or section filter:
// the assignments of the whole term are loaded once,
// and the class / section choice filters them here (no new request).
@Component({
  selector: 'app-class-subjects-tab',
  imports: [
    ClassSubjectsSelector,
    ClassSubjectsTable,
    MatDialogModule,
  ],
  templateUrl: './class-subjects-tab.html',
  styleUrl: './class-subjects-tab.css',
})
export class ClassSubjectsTab implements OnInit {

  private readonly termsService = inject(AcademicTermsService);
  private readonly yearsService = inject(AcademicYearsService);
  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly teachersService = inject(TeachersService);
  private readonly subjectsService = inject(SubjectsService);

  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);


  // Shows the add, edit and activate / deactivate actions (Admin only).
  readonly canManage = input(false);


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // =========================
  // Selection: term / class / section
  // =========================

  readonly terms = signal<TermOption[]>([]);
  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<ActiveSectionDto[]>([]);

  readonly termsLoading = signal(false);
  readonly sectionsLoading = signal(false);

  readonly termId = signal<number | null>(null);
  readonly classId = signal<number | null>(null);
  readonly sectionId = signal<number | null>(null);


  // =========================
  // Data
  // =========================

  // Every assignment of the selected term (all classes and sections).
  readonly assignments = signal<TeacherAssignment[]>([]);

  // Every teacher (active and inactive): used only for the names in the
  // table, since the assignments response has the teacher id, not the name.
  // The add/edit form searches teachers in the backend by itself.
  readonly teachers = signal<TeacherListDto[]>([]);

  readonly assignmentsLoading = signal(false);
  readonly errorMessage = signal('');

  // true while the subjects list is loading before the add dialog opens.
  readonly openingForm = signal(false);


  // =========================
  // Table
  // =========================

  // true when a section is chosen (the table is shown).
  readonly hasSelection = computed(
    () => this.termId() !== null
      && this.classId() !== null
      && this.sectionId() !== null
  );

  // The subjects of the selected section, sorted by name.
  readonly rows = computed<ClassSubjectRow[]>(() => {

    if (!this.hasSelection()) {
      return [];
    }

    const isArabic = this.isArabic();

    const teachersById = new Map(
      this.teachers().map(t => [t.teacherId, t])
    );

    return this.assignments()
      .filter(a =>
        a.classId === this.classId()
        && a.sectionId === this.sectionId()
      )
      .map(assignment => {

        const teacher = teachersById.get(assignment.teacherId);

        return {
          assignment,
          subjectName: isArabic ? assignment.subjectAr : assignment.subjectEn,
          teacherName: teacher ? getTeacherFullName(teacher, isArabic) : '',
          teacherInactive: teacher ? !teacher.isActive : false,
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  });

  readonly counts = computed<ClassSubjectsCounts>(() => {

    const rows = this.rows();
    const active = rows.filter(r => r.assignment.isActive).length;

    return {
      total: rows.length,
      active,
      inactive: rows.length - active,
    };
  });

  readonly selectedTermLabel = computed(() => {

    const term = this.terms().find(
      t => t.academicTermId === this.termId()
    );

    return term ? getTermLabel(term, this.isArabic()) : '';
  });

  readonly selectedClassName = computed(() => {

    const schoolClass = this.classes().find(
      c => c.schoolClassId === this.classId()
    );

    if (!schoolClass) {
      return '';
    }

    return this.isArabic()
      ? schoolClass.classNameAr
      : schoolClass.classNameEn;
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


  ngOnInit(): void {
    this.loadTerms();
    this.loadClasses();
    this.loadTeachers();
  }


  // =========================
  // Lookups
  // =========================

  // GET /api/academicterms + GET /api/academicyears (for the year name).
  // The current term is selected by default.
  private loadTerms(): void {

    this.termsLoading.set(true);

    forkJoin({
      terms: this.termsService.getAcademicTerms(),
      years: this.yearsService.getAcademicYears(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ terms, years }) => {

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
            }))
            .sort((a, b) => b.startDate.localeCompare(a.startDate));

          this.terms.set(options);
          this.termsLoading.set(false);

          const selected =
            options.find(t => t.isCurrent) ?? options[0];

          if (selected) {
            this.onTermChange(selected.academicTermId);
          }
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load academic terms:', error);

          this.terms.set([]);
          this.termsLoading.set(false);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // GET /api/schoolclasses/active
  private loadClasses(): void {

    this.classesService
      .getActiveSchoolClasses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.classes.set(response.success ? response.data : []);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load classes:', error);
          this.classes.set([]);
        },
      });
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
        },
      });
  }


  // GET /api/teachers?pageSize=100 (active and inactive).
  // The assignments only carry teacherId and teacherNumber,
  // so the names come from this list.
  // If it fails, the table still works and shows the teacher number only.
  private loadTeachers(): void {

    this.teachersService
      .getTeachers(1, TEACHERS_PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.teachers.set(response.success ? response.data.items : []);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load teachers:', error);
          this.teachers.set([]);
        },
      });
  }


  // GET /api/teacherassignments?academicTermId=...
  loadAssignments(): void {

    const termId = this.termId();

    if (termId === null) {
      return;
    }

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

          this.assignments.set([]);
          this.errorMessage.set('SUBJECTS.ERROR.LOAD_FAILED');
          this.assignmentsLoading.set(false);
        },
      });
  }


  // =========================
  // Selection changes
  // =========================

  // A new term: load its assignments (class and section stay selected).
  onTermChange(termId: number): void {
    this.termId.set(termId);
    this.loadAssignments();
  }

  // A new class: its sections are loaded and the section is cleared.
  onClassChange(classId: number): void {
    this.classId.set(classId);
    this.sectionId.set(null);
    this.sections.set([]);
    this.loadSections(classId);
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
  openAddAssignment(): void {

    const termId = this.termId();
    const classId = this.classId();
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

          // The same subject cannot be added twice to the same
          // section and term, so the subjects already added are hidden.
          const usedSubjectIds = new Set(
            this.rows().map(r => r.assignment.subjectId)
          );

          const isArabic = this.isArabic();

          const subjects = response.data
            .filter(s => s.isActive && !usedSubjectIds.has(s.subjectId))
            .sort((a, b) =>
              (isArabic ? a.subjectAr : a.subjectEn)
                .localeCompare(isArabic ? b.subjectAr : b.subjectEn)
            );

          this.openForm({
            mode: 'add',
            academicTermId: termId,
            classId,
            sectionId,
            termLabel: this.selectedTermLabel(),
            className: this.selectedClassName(),
            sectionName: this.selectedSectionName(),
            subjects,
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


  // Edit the teacher and the passing mark (PUT /api/teacherassignments/{id}).
  openEditAssignment(row: ClassSubjectRow): void {

    const assignment = row.assignment;
    const isArabic = this.isArabic();

    this.openForm({
      mode: 'edit',
      academicTermId: assignment.academicTermId,
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      termLabel: this.selectedTermLabel(),
      className: isArabic ? assignment.classNameAr : assignment.classNameEn,
      sectionName: isArabic ? assignment.sectionAr : assignment.sectionEn,
      subjects: [],
      assignment,
      currentTeacher: this.findActiveTeacher(assignment.teacherId),
      subjectName: row.subjectName,
      currentTeacherName: row.teacherName || assignment.teacherNumber,
      currentTeacherInactive: row.teacherInactive,
    });
  }


  // Activate / deactivate directly, like the rest of the site
  // (PATCH /api/teacherassignments/{id}/status).
  toggleAssignmentStatus(row: ClassSubjectRow): void {

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

  // The teacher, only when found and still active
  // (preselected in the edit form).
  private findActiveTeacher(teacherId: number): TeacherListDto | undefined {

    return this.teachers().find(
      t => t.teacherId === teacherId && t.isActive
    );
  }


  // The form saves the assignment itself and closes with { success: true }.
  private openForm(data: AssignmentFormData): void {

    this.dialog
      .open(AssignmentForm, {
        width: '560px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data,
      })
      .afterClosed()
      .subscribe((result) => {

        if (result?.success) {
          this.loadAssignments();
        }
      });
  }
}