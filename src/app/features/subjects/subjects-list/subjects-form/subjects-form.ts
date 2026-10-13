import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
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

import { TranslatePipe } from '@ngx-translate/core';

import {
  SubjectDto,
  SubjectRequest,
  SubjectsService,
} from '../../../../core/services/subjects';
import { ApiMessageService } from '../../../../core/services/api-message';
import { ActionResult } from '../../../../shared/services/action-result';


// Data passed when the dialog is opened.
// Without a subject the form adds a new one; with a subject it edits it.
export interface SubjectFormData {
  subject?: SubjectDto;
}


@Component({
  selector: 'app-subjects-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-form.html',
  styleUrl: './subjects-form.css',
})
export class SubjectsForm {

  // Form builder used to create and configure the subject form.
  private readonly fb = inject(FormBuilder);

  // Reference used to close the subject form dialog.
  private readonly dialogRef =
    inject(MatDialogRef<SubjectsForm>);

  private readonly subjectsService = inject(SubjectsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  // The subject being edited (undefined = add mode).
  private readonly subject =
    inject<SubjectFormData | null>(MAT_DIALOG_DATA, { optional: true })
      ?.subject;

  readonly isEditMode = this.subject !== undefined;

  // true while the request is running (prevents double clicks).
  readonly isSubmitting = signal(false);


  // Subject form fields and validation rules.
  // The API fields are subjectAr / subjectEn.
  readonly subjectForm = this.fb.nonNullable.group({

    // Arabic subject name.
    subjectAr: [
      this.subject?.subjectAr ?? '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[؀-ۿ\s.-]+$/),
      ],
    ],

    // English subject name.
    subjectEn: [
      this.subject?.subjectEn ?? '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[A-Za-z\s.-]+$/),
      ],
    ],
  });


  // Saves the subject: POST /api/subjects or PUT /api/subjects/{id}.
  onSubmit(): void {

    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    const value = this.subjectForm.getRawValue();

    const data: SubjectRequest = {
      subjectAr: value.subjectAr.trim(),
      subjectEn: value.subjectEn.trim(),
    };

    const request = this.subject
      ? this.subjectsService.updateSubject(this.subject.subjectId, data)
      : this.subjectsService.createSubject(data);

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

          console.error('Failed to save subject:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // Closes the form without submitting.
  cancel(): void {
    this.dialogRef.close();
  }


  // Checks whether a field is invalid and has been touched.
  isFieldInvalid(
    fieldName: keyof typeof this.subjectForm.controls
  ): boolean {

    const control =
      this.subjectForm.controls[fieldName];

    return control.invalid && control.touched;
  }
}
