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

import { SubjectsService } from '../../../../core/services/subjects';
import { ApiMessageService } from '../../../../core/services/api-message';
import { ActionResult } from '../../../../shared/services/action-result';
import { SubjectDto, SubjectRequest } from '../../../../core/models/subject';
import { Language } from '../../../../core/services/language';
import { requiredTextValidator } from '../../../../shared/utils/form-validators';

import {
  errorsCountKey,
  focusFirstInvalid,
  restartWhenCleared,
  showFieldError,
  useDiscardOnClose,
} from '../../shared/subjects-form-dialog';


// Data passed when the dialog is opened.
// Without a subject the form adds a new one; with a subject it edits it.
export interface SubjectFormData {
  subject?: SubjectDto;
}


// The longest subject name.
const SUBJECT_NAME_MAX_LENGTH = 100;


// Add / edit subject dialog (navy & gold, 13 Nov 2026).
// Works like the class form: fixed header (title, one line, ✕), the two
// name fields, fixed footer; "Discard changes?" before closing with
// unsaved changes; on save with errors the first wrong field gets the focus.
// Opened by the subjects list tab with panelClass 'form-dialog'.
@Component({
  selector: 'app-subjects-catalog-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-catalog-form.html',
  styleUrl: './subjects-catalog-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd',
  },
})
export class SubjectsCatalogForm {

  // Form builder used to create and configure the subject form.
  private readonly fb = inject(FormBuilder);

  // Reference used to close the subject form dialog.
  private readonly dialogRef =
    inject(MatDialogRef<SubjectsCatalogForm>);

  private readonly subjectsService = inject(SubjectsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly nameMaxLength = SUBJECT_NAME_MAX_LENGTH;

  // The subject being edited (undefined = add mode).
  private readonly subject =
    inject<SubjectFormData | null>(MAT_DIALOG_DATA, { optional: true })
      ?.subject;

  readonly isEditMode = this.subject !== undefined;

  // true while the request is running (prevents double clicks).
  readonly isSubmitting = signal(false);

  // Edit header line: the subject name in the UI language.
  readonly subjectName = computed(() => {
    if (!this.subject) {
      return '';
    }

    return this.language.currentDirection() === 'rtl'
      ? this.subject.subjectAr
      : this.subject.subjectEn;
  });

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);
  readonly errorsKey = computed(() => errorsCountKey(this.invalidCount()));


  // Subject form fields and validation rules.
  // The API fields are subjectAr / subjectEn.
  readonly subjectForm = this.fb.nonNullable.group({

    // Arabic subject name.
    subjectAr: [
      this.subject?.subjectAr ?? '',
      [
        requiredTextValidator,
        Validators.minLength(2),
        Validators.maxLength(SUBJECT_NAME_MAX_LENGTH),
        Validators.pattern(/^[؀-ۿ\s.-]+$/),
      ],
    ],

    // English subject name.
    subjectEn: [
      this.subject?.subjectEn ?? '',
      [
        requiredTextValidator,
        Validators.minLength(2),
        Validators.maxLength(SUBJECT_NAME_MAX_LENGTH),
        Validators.pattern(/^[A-Za-z\s.-]+$/),
      ],
    ],
  });


  // ✕, Cancel, backdrop click and Esc: asks first when something changed.
  readonly closing = useDiscardOnClose({
    isDirty: () => this.subjectForm.dirty,
    isBusy: () => this.isSubmitting(),
  });


  constructor() {

    // Keep the error count up to date while the user fixes the fields.
    this.subjectForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    restartWhenCleared(
      [this.subjectForm.controls.subjectAr, this.subjectForm.controls.subjectEn],
      this.destroyRef
    );
  }


  // Saves the subject: POST /api/subjects or PUT /api/subjects/{id}.
  onSubmit(): void {

    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      focusFirstInvalid(this.host);
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


  // Fields that are still wrong.
  private countInvalid(): number {
    return Object.values(this.subjectForm.controls)
      .filter(control => control.invalid)
      .length;
  }


  // Wrong characters at once, a too-short name on leaving the field,
  // an empty one after pressing the button (see showFieldError()).
  isFieldInvalid(
    fieldName: keyof typeof this.subjectForm.controls
  ): boolean {

    return showFieldError(
      this.subjectForm.controls[fieldName],
      this.submitAttempted()
    );
  }
}
