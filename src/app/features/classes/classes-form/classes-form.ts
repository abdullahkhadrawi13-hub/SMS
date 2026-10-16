import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { TranslatePipe } from '@ngx-translate/core';

import {
  SchoolClass,
  CreateSchoolClassRequest,
  UpdateSchoolClassRequest
} from '../../../core/models/school-class';
import { SchoolClassesService } from '../../../core/services/school-classes';
import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';

// Data passed to the dialog.
// No schoolClass = add mode, a schoolClass = edit mode.
export interface ClassFormData {
  schoolClass?: SchoolClass;
}

// Value returned when the dialog closes after a successful save.
export interface ClassFormResult {
  success: true;
  action: 'created' | 'updated';
}

@Component({
  selector: 'app-classes-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    TranslatePipe
  ],
  templateUrl: './classes-form.html',
  styleUrl: './classes-form.css'
})
export class ClassesForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<ClassesForm, ClassFormResult>);

  private readonly classesService = inject(SchoolClassesService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  readonly data =
    inject<ClassFormData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  // True while the request is being sent (prevents a double submit).
  readonly isSubmitting = signal(false);

  readonly classForm = this.fb.nonNullable.group({

    // Arabic letters, digits (e.g. "الصف 10"), spaces, dots and dashes.
    classNameAr: [
      this.data.schoolClass?.classNameAr ?? '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[\u0600-\u06FF0-9\s.-]+$/)
      ]
    ],

    // English letters, digits (e.g. "Grade 10"), spaces, dots and dashes.
    classNameEn: [
      this.data.schoolClass?.classNameEn ?? '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[A-Za-z0-9\s.-]+$/)
      ]
    ],

    // Level: a whole number above 0 (the backend also checks it is unique).
    level: [
      this.data.schoolClass?.level ?? (null as number | null),
      [
        Validators.required,
        Validators.min(1),
        Validators.pattern(/^\d+$/)
      ]
    ],

    isGraduationGrade: [
      this.data.schoolClass?.isGraduationGrade ?? false
    ]

  });

  get isEditMode(): boolean {
    return !!this.data.schoolClass;
  }

  // Shows a field's error only after the user touched it or pressed save.
  isFieldInvalid(
    field: 'classNameAr' | 'classNameEn' | 'level'
  ): boolean {
    const control = this.classForm.controls[field];

    return control.invalid && (control.touched || control.dirty);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {

    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    const formValue = this.classForm.getRawValue();

    // Same body for create and update.
    const request: CreateSchoolClassRequest & UpdateSchoolClassRequest = {
      classNameAr: formValue.classNameAr.trim(),
      classNameEn: formValue.classNameEn.trim(),
      level: Number(formValue.level),
      isGraduationGrade: formValue.isGraduationGrade
    };

    const schoolClass = this.data.schoolClass;

    const request$ = schoolClass
      ? this.classesService.updateSchoolClass(
          schoolClass.schoolClassId,
          request
        )
      : this.classesService.createSchoolClass(request);

    this.isSubmitting.set(true);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          // Business error (e.g. duplicate name or level):
          // keep the dialog open so the user can fix the value.
          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.dialogRef.close({
            success: true,
            action: this.isEditMode ? 'updated' : 'created'
          });

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to save class:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }

}
