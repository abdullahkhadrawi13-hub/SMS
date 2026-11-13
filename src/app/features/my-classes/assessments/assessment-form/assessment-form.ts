import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
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
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
import {
  errorsCountKey,
  focusFirstInvalid,
  restartWhenCleared,
  showFieldError,
  useDiscardOnClose,
} from '../../../subjects/shared/subjects-form-dialog';
import { AssessmentFormData } from '../assessments';


// The name of one of the form's controls.
type FieldName = 'nameAr' | 'nameEn' | 'maxMark';


// Add an assessment under an open component, or edit one the teacher added
// (POST /api/assessments, PUT /api/assessments/{id}, API Reference section 9).
// The order is not shown: a new assessment goes after the last one,
// and an edited one keeps its place.
// Both requests return the assessment; the dialog closes with it.
//
// The shared form dialog look (navy & gold, 13 Nov 2026), like the class
// and section forms: a plain dialog (not in the URL), fixed header and footer,
// "Discard changes?" before closing with unsaved changes (backdrop click,
// Esc, ✕ and Cancel), errors shown at the right time (showFieldError),
// and the first wrong field focused on save with the error count in the footer.
// The helpers are the Subjects section's ones (subjects-form-dialog.ts).
// Opened by the assessments page with panelClass 'form-dialog'
// (full screen on the phone, see styles.css).
@Component({
  selector: 'app-assessment-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './assessment-form.html',
  styleUrl: './assessment-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd',
  },
})
export class AssessmentForm {

  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly dialogRef =
    inject(MatDialogRef<AssessmentForm, Assessment>);

  private readonly assessmentsService = inject(AssessmentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<AssessmentFormData>(MAT_DIALOG_DATA);

  readonly isEditMode = this.data.mode === 'edit';

  readonly isSubmitting = signal(false);

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);
  readonly errorsKey = computed(() => errorsCountKey(this.invalidCount()));

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

    // TODO(grades): make this field read-only when the assessment has marks
    // (the backend refuses a new max mark then). The assessment response
    // does not say yet whether it has marks, so a note explains it instead.
    maxMark: [
      (this.data.assessment?.maxMark ?? null) as number | null,
      [Validators.required, maxMarkValidator],
    ],
  });


  // ✕, Cancel, backdrop click and Esc: asks first when something changed.
  readonly closing = useDiscardOnClose({
    isDirty: () => this.assessmentForm.dirty,
    isBusy: () => this.isSubmitting(),
  });


  constructor() {

    // Keep the error count up to date while the user fixes the fields.
    this.assessmentForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    const c = this.assessmentForm.controls;
    restartWhenCleared([c.nameAr, c.nameEn, c.maxMark], this.destroyRef);
  }


  // Wrong characters at once, other errors on leaving the field,
  // an empty field after pressing the button (see showFieldError()).
  isInvalid(name: FieldName): boolean {
    return showFieldError(this.assessmentForm.controls[name], this.submitAttempted());
  }


  private countInvalid(): number {
    return Object.values(this.assessmentForm.controls)
      .filter((control: AbstractControl) => control.invalid)
      .length;
  }


  onSubmit(): void {

    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    if (this.assessmentForm.invalid) {
      this.assessmentForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      focusFirstInvalid(this.host);
      return;
    }

    const value = this.assessmentForm.getRawValue();

    // Names are sent without spaces at the start and end.
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

          // Business error: keep the dialog open so the teacher can fix the value.
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
}
