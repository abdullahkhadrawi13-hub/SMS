import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { catchError, debounceTime, filter, map, of, switchMap, tap } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../../core/services/api-message';
import { TeacherAssignmentsService } from '../../../../core/services/teacher-assignments';
import { TeachersService } from '../../../../core/services/teachers';
import { ActionResult } from '../../../../shared/services/action-result';
import { Language } from '../../../../core/services/language';

import {
  formatNumber,
  nameInitials,
  SubjectOption,
  teacherOptionFromDto,
  TeacherOption,
} from '../../shared/subjects-shared';
import { TeacherAssignment } from '../../../../core/models/teacher-assignment';
import {
  errorsCountKey,
  focusFirstInvalid,
  showFieldError,
  useDiscardOnClose,
} from '../../shared/subjects-form-dialog';


// Data passed by the parent (subject-assignments-tab) when the dialog is opened.
export interface SubjectAssignmentsFormData {
  mode: 'add' | 'edit';

  // The selected term / class / section (fixed in both modes).
  academicTermId: number;
  classId: number;
  sectionId: number;

  // Names shown in the line under the title.
  termLabel: string;
  className: string;
  sectionName: string;

  // Add mode: the active subjects not yet added to this section,
  // each with its plan for the term and class (null = no plan: shown disabled).
  subjects: SubjectOption[];

  // Add mode: the subject chosen when the form opens (or null).
  preselectedSubjectId: number | null;

  // Edit mode only.
  assignment?: TeacherAssignment;

  // Edit mode: the current teacher, built from the assignment and passed
  // only when still active (preselected in the teacher field).
  currentTeacher?: TeacherOption;

  subjectName?: string;
  currentTeacherName?: string;
  currentTeacherInactive?: boolean;
}


// How the dialog closes:
// - { success: true }: the assignment was saved (the parent reloads the table)
// - { createPlanFor }: "Create the plan first" was clicked; the parent opens the
//   plans tab and its "New plan" form (for this subject, or none when null)
export interface SubjectAssignmentsFormResult {
  success?: boolean;
  createPlanFor?: number | null;
}


// Teacher search (combobox): the same timing as the teachers list
// (13 Nov 2026): it searches from the first letter, 400ms after the last key,
// and shows at most this many results.
const TEACHER_SEARCH_DEBOUNCE_MS = 400;
const TEACHER_SEARCH_PAGE_SIZE = 20;

// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css.
const AVATAR_TONES = 6;


// The teacher field holds the typed text (string) until a teacher is chosen
// from the list (TeacherOption). Only a chosen teacher is valid.
function teacherSelectedValidator(
  control: AbstractControl
): ValidationErrors | null {

  const value = control.value;

  if (value === null || value === '') {
    return null;
  }

  return typeof value === 'object'
    ? null
    : { teacherNotSelected: true };
}


// Add a subject to a section, or edit it (the teacher only).
// POST /api/teacherassignments and PUT /api/teacherassignments/{id}.
//
// The passing mark and the assessment components come from the subject plan
// (API Reference, section 9). A subject without a plan for this term and class
// cannot be added (the backend answers 400), so it is shown disabled,
// with a link to create the plan first.
//
// The shared form dialog look (navy & gold, 13 Nov 2026), like the class form:
// "Discard changes?" before closing with unsaved changes, errors shown at the
// right time (showFieldError), the first wrong field focused on save.
// The subject is a plain <select> whose options say the state of their plan;
// the teacher stays a search (mat-autocomplete) in the shared field look.
// Opened by the assignments tab with panelClass 'form-dialog'.
@Component({
  selector: 'app-subject-assignments-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './subject-assignments-form.html',
  styleUrl: './subject-assignments-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd',
  },
})
export class SubjectAssignmentsForm implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<SubjectAssignmentsForm>);

  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly teachersService = inject(TeachersService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly data = inject<SubjectAssignmentsFormData>(MAT_DIALOG_DATA);

  readonly isEditMode = this.data.mode === 'edit';

  // true while the request is running (prevents double clicks).
  readonly isSubmitting = signal(false);

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);
  readonly errorsKey = computed(() => errorsCountKey(this.invalidCount()));

  // Teacher search (GET /api/teachers?search=...&isActive=true).
  // Each result is turned into a TeacherOption, the type the field holds.
  readonly teacherResults = signal<TeacherOption[]>([]);
  readonly teachersLoading = signal(false);
  readonly teachersError = signal(false);

  // The text of the last finished search ('' = no search yet).
  readonly searchedText = signal('');


  readonly assignmentForm = this.fb.group({

    // Add mode only (the subject cannot change after creation).
    // A preselected subject is used only when it has a plan.
    subjectId: [
      this.initialSubjectId(),
      this.isEditMode ? [] : [Validators.required],
    ],

    // Edit mode: the current teacher is preselected only when still active.
    // An inactive teacher is not passed, so the admin must pick another one.
    teacher: [
      (this.data.currentTeacher ?? null) as TeacherOption | string | null,
      [Validators.required, teacherSelectedValidator],
    ],
  });


  // =========================
  // Subjects and their plans (add mode)
  // =========================

  readonly formatNumber = formatNumber;

  // The chosen subject (updated when the select changes).
  private readonly selectedSubjectId = signal<number | null>(
    this.assignmentForm.controls.subjectId.value
  );

  // The plan of the chosen subject, shown under the select.
  readonly selectedPlan = computed(() => {

    const id = this.selectedSubjectId();

    return this.data.subjects.find(o => o.subject.subjectId === id)?.plan ?? null;
  });

  // The subjects that cannot be chosen yet (no plan for this term and class).
  readonly subjectsWithoutPlan = computed(
    () => this.data.subjects.filter(o => o.plan === null)
  );

  // Their names, joined: "Art Education، Computer".
  readonly subjectsWithoutPlanNames = computed(
    () => this.subjectsWithoutPlan()
      .map(o => this.getSubjectName(o))
      .join('، ')
  );


  // ✕, Cancel, backdrop click and Esc: asks first when something changed.
  readonly closing = useDiscardOnClose({
    isDirty: () => this.assignmentForm.dirty,
    isBusy: () => this.isSubmitting(),
  });


  ngOnInit(): void {
    this.listenToTeacherSearch();

    // Keep the error count up to date while the user fixes the fields.
    this.assignmentForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    this.assignmentForm.controls.subjectId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.selectedSubjectId.set(id));
  }


  // The preselected subject, when it can be chosen (it has a plan).
  private initialSubjectId(): number | null {

    const id = this.data.preselectedSubjectId;

    const option = this.data.subjects.find(o => o.subject.subjectId === id);

    return option?.plan ? option.subject.subjectId : null;
  }


  // Searches the backend while the admin types (one request after a short
  // pause; a newer search cancels the older one).
  private listenToTeacherSearch(): void {

    this.assignmentForm.controls.teacher.valueChanges
      .pipe(
        // A chosen teacher (object) is not a search.
        filter((value): value is string => typeof value === 'string'),
        map(value => value.trim()),

        tap(text => {
          this.teacherResults.set([]);
          this.teachersError.set(false);
          this.searchedText.set('');
          this.teachersLoading.set(text.length > 0);
        }),

        debounceTime(TEACHER_SEARCH_DEBOUNCE_MS),

        switchMap(text => {

          // An empty field sends nothing (the list stays closed).
          if (text.length === 0) {
            return of(null);
          }

          return this.teachersService
            .getTeachers(1, TEACHER_SEARCH_PAGE_SIZE, text, true)
            .pipe(
              map(response => ({ text, response })),
              catchError((error: HttpErrorResponse) => {
                console.error('Failed to search teachers:', error);
                return of({ text, response: null });
              })
            );
        }),

        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {

        this.teachersLoading.set(false);

        if (!result) {
          return;
        }

        if (!result.response?.success) {
          this.teachersError.set(true);
          return;
        }

        this.teacherResults.set(
          result.response.data.items.map(teacherOptionFromDto)
        );
        this.searchedText.set(result.text);
      });
  }


  // The text shown in the teacher field after a teacher is chosen.
  readonly displayTeacher = (value: TeacherOption | string | null): string => {

    if (!value) {
      return '';
    }

    return typeof value === 'string'
      ? value
      : this.getTeacherName(value);
  };


  // Shows the ✕ button of the teacher field.
  get hasTeacherValue(): boolean {
    return !!this.assignmentForm.controls.teacher.value;
  }


  clearTeacher(): void {
    this.assignmentForm.controls.teacher.setValue(null);
    this.assignmentForm.controls.teacher.markAsDirty();
    this.assignmentForm.controls.teacher.markAsUntouched();

    document.getElementById('af-teacher')?.focus();
  }


  isArabic(): boolean {
    return this.language.currentDirection() === 'rtl';
  }


  // The text of a subject in the list: its name, and the state of its plan
  // when it is not ready ("(No plan)", "(Weights 80 of 100)").
  subjectOptionLabel(option: SubjectOption): string {

    if (!option.plan) {
      return 'SUBJECTS.ASSIGNMENTS_FORM.OPTION_NO_PLAN';
    }

    return option.plan.isComplete
      ? 'SUBJECTS.ASSIGNMENTS_FORM.OPTION_READY'
      : 'SUBJECTS.ASSIGNMENTS_FORM.OPTION_INCOMPLETE';
  }

  subjectOptionParams(option: SubjectOption): { name: string; total: string } {
    return {
      name: this.getSubjectName(option),
      total: formatNumber(option.plan?.totalWeight ?? 0),
    };
  }


  // The teacher's avatar in the results: initials and colour
  // (the same colour for the same teacher, as in the teachers list).
  teacherInitials(teacher: TeacherOption): string {
    return nameInitials(this.getTeacherName(teacher));
  }

  avatarTone(teacher: TeacherOption): number {
    return (teacher.teacherId % AVATAR_TONES) + 1;
  }

  getSubjectName(option: SubjectOption): string {
    return this.isArabic() ? option.subject.subjectAr : option.subject.subjectEn;
  }

  getTeacherName(teacher: TeacherOption): string {
    return this.isArabic() ? teacher.nameAr : teacher.nameEn;
  }


  // Add mode: nothing to choose when every active subject is already added.
  get noSubjects(): boolean {
    return !this.isEditMode && this.data.subjects.length === 0;
  }

  // Add mode: some subjects are left, but none of them has a plan yet.
  get noSubjectWithPlan(): boolean {
    return !this.isEditMode
      && this.data.subjects.length > 0
      && this.data.subjects.every(o => o.plan === null);
  }


  // "Create the plan first": the dialog closes and the parent opens the plans
  // tab with its "New plan" form (for the subject when only one has no plan).
  createPlanFirst(): void {

    const withoutPlan = this.subjectsWithoutPlan();

    this.dialogRef.close({
      createPlanFor: withoutPlan.length === 1
        ? withoutPlan[0].subject.subjectId
        : null,
    } satisfies SubjectAssignmentsFormResult);
  }


  // An empty field says "required" after pressing the button; a typed
  // teacher that was not chosen from the list says so on leaving the field.
  isFieldInvalid(
    fieldName: keyof typeof this.assignmentForm.controls
  ): boolean {

    return showFieldError(
      this.assignmentForm.controls[fieldName],
      this.submitAttempted(),
      []
    );
  }


  private countInvalid(): number {
    return Object.values(this.assignmentForm.controls)
      .filter((control: AbstractControl) => control.invalid)
      .length;
  }


  onSubmit(): void {

    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting() || this.noSubjects || this.noSubjectWithPlan) {
      return;
    }

    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      focusFirstInvalid(this.host);
      return;
    }

    const value = this.assignmentForm.getRawValue();

    const teacherId = (value.teacher as TeacherOption).teacherId;

    const assignment = this.data.assignment;

    const request = this.isEditMode && assignment
      ? this.assignmentsService.updateAssignment(
          assignment.teacherAssignmentId,
          { teacherId }
        )
      : this.assignmentsService.createAssignment({
          teacherId,
          academicTermId: this.data.academicTermId,
          classId: this.data.classId,
          sectionId: this.data.sectionId,
          subjectId: value.subjectId as number,
        });

    this.isSubmitting.set(true);

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.dialogRef.close({ success: true } satisfies SubjectAssignmentsFormResult);

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to save section subject:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }

}