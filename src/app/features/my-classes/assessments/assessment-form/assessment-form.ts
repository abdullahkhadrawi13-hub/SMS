import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
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

import { ApiMessageService } from '../../../../core/services/api-message';
import { AssessmentsService } from '../../../../core/services/assessments';
import { ActionResult } from '../../../../shared/services/action-result';
import { Assessment } from '../../../../core/models/assessment';

import { formatNumber } from '../../../subjects/shared/subjects-shared';
import {
  arabicNameValidator,
  COMPONENT_NAME_MAX_LENGTH,
  englishNameValidator,
  MAX_MARK_LIMIT,
  maxMarkValidator,
} from '../../../subjects/subject-plans/plan-validators';
import { AssessmentFormData } from '../assessments';


// Add an assessment under an open component, or edit one the teacher added
// (POST /api/assessments, PUT /api/assessments/{id}, API Reference section 9).
// The order is not shown: a new assessment goes after the last one,
// and an edited one keeps its place.
// Both requests return the assessment; the dialog closes with it.
@Component({
  selector: 'app-assessment-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
  ],
  templateUrl: './assessment-form.html',
  styleUrl: './assessment-form.css',
})
export class AssessmentForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<AssessmentForm, Assessment>);

  private readonly assessmentsService = inject(AssessmentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<AssessmentFormData>(MAT_DIALOG_DATA);

  readonly isEditMode = this.data.mode === 'edit';

  readonly isSubmitting = signal(false);

  readonly nameMaxLength = COMPONENT_NAME_MAX_LENGTH;

  readonly maxMarkLimit = formatNumber(MAX_MARK_LIMIT);

  readonly componentWeight = formatNumber(this.data.component.weight);


  readonly assessmentForm = this.fb.group({

    nameAr: [
      this.data.assessment?.nameAr ?? '',
      [Validators.required, Validators.maxLength(COMPONENT_NAME_MAX_LENGTH), arabicNameValidator],
    ],

    nameEn: [
      this.data.assessment?.nameEn ?? '',
      [Validators.required, Validators.maxLength(COMPONENT_NAME_MAX_LENGTH), englishNameValidator],
    ],

    // TODO(grades): disable this field when the assessment has marks
    // (the backend refuses a new max mark then).
    maxMark: [
      (this.data.assessment?.maxMark ?? null) as number | null,
      [Validators.required, maxMarkValidator],
    ],
  });


  isInvalid(control: AbstractControl): boolean {
    return control.invalid && control.touched;
  }


  onSubmit(): void {

    if (this.assessmentForm.invalid) {
      this.assessmentForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    const value = this.assessmentForm.getRawValue();

    const body = {
      nameAr: (value.nameAr ?? '').trim(),
      nameEn: (value.nameEn ?? '').trim(),
      maxMark: Number(value.maxMark),
    };

    const assessment = this.data.assessment;

    const request = this.isEditMode && assessment
      ? this.assessmentsService.updateAssessment(
          assessment.assessmentId,
          { ...body, order: assessment.order }
        )
      : this.assessmentsService.createAssessment({
          ...body,
          teacherAssignmentId: this.data.teacherAssignmentId,
          subjectPlanComponentId: this.data.component.subjectPlanComponentId,
          order: this.data.nextOrder,
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

          this.dialogRef.close(response.data);

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to save assessment:', error);

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