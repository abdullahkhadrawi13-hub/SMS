import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { catchError, debounceTime, filter, map, of, switchMap, tap } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../../core/services/api-message';
import { SubjectDto } from '../../../../core/models/subject';
import { TeacherAssignmentsService } from '../../../../core/services/teacher-assignments';
import { TeachersService } from '../../../../core/services/teachers';
import { ActionResult } from '../../../../shared/services/action-result';

import { DEFAULT_PASSING_MARK, getTeacherFullName } from '../../subject';
import { TeacherListDto } from '../../../../core/models/teacher';
import { TeacherAssignment } from '../../../../core/models/teacher-assignment';


// Data passed by the parent (class-subjects) when the dialog is opened.
export interface AssignmentFormData {
  mode: 'add' | 'edit';

  // The selected term / class / section (fixed in both modes).
  academicTermId: number;
  classId: number;
  sectionId: number;

  // Names shown in the read-only box.
  termLabel: string;
  className: string;
  sectionName: string;

  // Add mode: the active subjects not yet added to this section.
  subjects: SubjectDto[];

  // Edit mode only.
  assignment?: TeacherAssignment;

  // Edit mode: the current teacher, passed only when still active
  // (preselected in the teacher field).
  currentTeacher?: TeacherListDto;

  subjectName?: string;
  currentTeacherName?: string;
  currentTeacherInactive?: boolean;
}


// The passing mark must be above 0 and at most 100 (API Reference, section 8).
function passingMarkValidator(
  control: AbstractControl
): ValidationErrors | null {

  const value = control.value;

  if (value === null || value === '') {
    return null;
  }

  const mark = Number(value);

  return mark > 0 && mark <= 100
    ? null
    : { passingMark: true };
}


// Teacher search (combobox): the search starts after this many characters,
// waits this long after the last key, and shows at most this many results.
const TEACHER_SEARCH_MIN_LENGTH = 2;
const TEACHER_SEARCH_DEBOUNCE_MS = 300;
const TEACHER_SEARCH_PAGE_SIZE = 20;


// The teacher field holds the typed text (string) until a teacher is chosen
// from the list (TeacherListDto). Only a chosen teacher is valid.
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


// Add a subject to a section, or edit it (teacher and passing mark only).
// POST /api/teacherassignments and PUT /api/teacherassignments/{id}.
@Component({
  selector: 'app-assignment-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './assignment-form.html',
  styleUrl: './assignment-form.css',
})
export class AssignmentForm implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<AssignmentForm>);

  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly teachersService = inject(TeachersService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<AssignmentFormData>(MAT_DIALOG_DATA);

  readonly isEditMode = this.data.mode === 'edit';

  // true while the request is running (prevents double clicks).
  readonly isSubmitting = signal(false);

  readonly minSearchLength = TEACHER_SEARCH_MIN_LENGTH;

  // Teacher search (GET /api/teachers?search=...&isActive=true).
  readonly teacherResults = signal<TeacherListDto[]>([]);
  readonly teachersLoading = signal(false);
  readonly teachersError = signal(false);

  // The text of the last finished search ('' = no search yet).
  readonly searchedText = signal('');


  readonly assignmentForm = this.fb.group({

    // Add mode only (the subject cannot change after creation).
    subjectId: [
      null as number | null,
      this.isEditMode ? [] : [Validators.required],
    ],

    // Edit mode: the current teacher is preselected only when still active.
    // An inactive teacher is not passed, so the admin must pick another one.
    teacher: [
      (this.data.currentTeacher ?? null) as TeacherListDto | string | null,
      [Validators.required, teacherSelectedValidator],
    ],

    passingMark: [
      (this.data.assignment?.passingMark ?? DEFAULT_PASSING_MARK) as number | null,
      [Validators.required, passingMarkValidator],
    ],
  });


  ngOnInit(): void {
    this.listenToTeacherSearch();
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
          this.teachersLoading.set(text.length >= TEACHER_SEARCH_MIN_LENGTH);
        }),

        debounceTime(TEACHER_SEARCH_DEBOUNCE_MS),

        switchMap(text => {

          if (text.length < TEACHER_SEARCH_MIN_LENGTH) {
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

        this.teacherResults.set(result.response.data.items);
        this.searchedText.set(result.text);
      });
  }


  // The text shown in the teacher field after a teacher is chosen.
  readonly displayTeacher = (value: TeacherListDto | string | null): string => {

    if (!value) {
      return '';
    }

    return typeof value === 'string'
      ? value
      : this.getTeacherName(value);
  };


  // The typed text, used to show the hint and the clear button.
  get teacherText(): string {

    const value = this.assignmentForm.controls.teacher.value;

    return typeof value === 'string' ? value.trim() : '';
  }


  get hasTeacherValue(): boolean {
    return !!this.assignmentForm.controls.teacher.value;
  }


  clearTeacher(): void {
    this.assignmentForm.controls.teacher.setValue(null);
  }


  isArabic(): boolean {
    return document.documentElement.lang === 'ar';
  }

  getSubjectName(subject: SubjectDto): string {
    return this.isArabic() ? subject.subjectAr : subject.subjectEn;
  }

  getTeacherName(teacher: TeacherListDto): string {
    return getTeacherFullName(teacher, this.isArabic());
  }


  // Add mode: nothing to choose when every active subject is already added.
  get noSubjects(): boolean {
    return !this.isEditMode && this.data.subjects.length === 0;
  }


  isFieldInvalid(
    fieldName: keyof typeof this.assignmentForm.controls
  ): boolean {

    const control = this.assignmentForm.controls[fieldName];

    return control.invalid && control.touched;
  }


  onSubmit(): void {

    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    const value = this.assignmentForm.getRawValue();

    const teacherId = (value.teacher as TeacherListDto).teacherId;
    const passingMark = Number(value.passingMark);

    const assignment = this.data.assignment;

    const request = this.isEditMode && assignment
      ? this.assignmentsService.updateAssignment(
          assignment.teacherAssignmentId,
          { teacherId, passingMark }
        )
      : this.assignmentsService.createAssignment({
          teacherId,
          academicTermId: this.data.academicTermId,
          classId: this.data.classId,
          sectionId: this.data.sectionId,
          subjectId: value.subjectId as number,
          passingMark,
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

          this.dialogRef.close({ success: true });

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


  cancel(): void {
    this.dialogRef.close();
  }
}