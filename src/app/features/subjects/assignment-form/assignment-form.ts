import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../core/services/api-message';
import { SubjectDto } from '../../../core/services/subjects';
import {
  TeacherAssignment,
  TeacherAssignmentsService,
} from '../../../core/services/teacher-assignments';
import { TeacherListDto } from '../../../core/services/teachers';
import { ActionResult } from '../../../shared/services/action-result';

import { DEFAULT_PASSING_MARK, getTeacherFullName } from '../subject';


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

  // Active teachers only.
  teachers: TeacherListDto[];

  // Edit mode only.
  assignment?: TeacherAssignment;
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


// Add a subject to a section, or edit it (teacher and passing mark only).
// POST /api/teacherassignments and PUT /api/teacherassignments/{id}.
@Component({
  selector: 'app-assignment-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './assignment-form.html',
  styleUrl: './assignment-form.css',
})
export class AssignmentForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<AssignmentForm>);

  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<AssignmentFormData>(MAT_DIALOG_DATA);

  readonly isEditMode = this.data.mode === 'edit';

  // true while the request is running (prevents double clicks).
  readonly isSubmitting = signal(false);

  // Edit mode: the current teacher is preselected only when still active.
  // An inactive teacher is not in the list, so the admin must pick another one.
  private readonly currentTeacherId =
    this.data.assignment
    && this.data.teachers.some(t => t.teacherId === this.data.assignment?.teacherId)
      ? this.data.assignment.teacherId
      : null;


  readonly assignmentForm = this.fb.group({

    // Add mode only (the subject cannot change after creation).
    subjectId: [
      null as number | null,
      this.isEditMode ? [] : [Validators.required],
    ],

    teacherId: [
      this.currentTeacherId,
      [Validators.required],
    ],

    passingMark: [
      (this.data.assignment?.passingMark ?? DEFAULT_PASSING_MARK) as number | null,
      [Validators.required, passingMarkValidator],
    ],
  });


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

  get noTeachers(): boolean {
    return this.data.teachers.length === 0;
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

    const teacherId = value.teacherId as number;
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
