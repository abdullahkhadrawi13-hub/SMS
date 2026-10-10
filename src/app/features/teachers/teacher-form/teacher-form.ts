import { Component, DestroyRef, inject, signal } from '@angular/core';
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
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';

import {
  CreateTeacherRequest,
  TeachersService,
  UpdateTeacherRequest,
} from '../../../core/services/teachers';

import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';


// Data passed when the dialog is opened.
// Without teacherId the form adds a teacher; with it the form edits that teacher.
export interface TeacherFormDialogData {
  teacherId?: number;
}


@Component({
  selector: 'app-teacher-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    MatIcon
],
  templateUrl: './teacher-form.html',
  styleUrl: './teacher-form.css',
})
export class TeacherForm {

  // Form builder used to create and configure the teacher form.
  private readonly fb = inject(FormBuilder);

  // Reference used to close the teacher form dialog.
  private readonly dialogRef =
    inject(MatDialogRef<TeacherForm>);

  // Service used to communicate with the Teachers API.
  private readonly teachersService = inject(TeachersService);

  // Used to stop pending requests when the dialog is closed.
  private readonly destroyRef = inject(DestroyRef);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  // Shows the success / error result dialog after saving.
  private readonly actionResult = inject(ActionResult);

  // Optional data passed by the page (teacherId in edit mode).
  private readonly dialogData =
    inject<TeacherFormDialogData | null>(
      MAT_DIALOG_DATA,
      { optional: true }
    );


  // Id of the teacher being edited, or null when adding a new teacher.
  readonly teacherId = signal<number | null>(
    this.dialogData?.teacherId ?? null
  );

  // True when the form edits an existing teacher.
  readonly isEditMode = signal(
    !!this.dialogData?.teacherId
  );

  // True while the teacher is being loaded in edit mode.
  readonly isLoading = signal(false);

  // True while the form is being saved.
  readonly isSubmitting = signal(false);

  // Error message (API message or translation key) shown above the form.
  readonly errorMessage = signal('');


  // Teacher form fields and validation rules.
  readonly teacherForm = this.fb.nonNullable.group({

    // Arabic name fields: allow Arabic letters, spaces, dots, and hyphens.
    firstNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[؀-ۿ\s.-]+$/),
      ],
    ],

    fatherNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[؀-ۿ\s.-]+$/),
      ],
    ],

    grandFatherNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[؀-ۿ\s.-]+$/),
      ],
    ],

    familyNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[؀-ۿ\s.-]+$/),
      ],
    ],

    // English name fields: allow English letters, spaces, dots, and hyphens.
    firstNameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[A-Za-z\s.-]+$/),
      ],
    ],

    fatherNameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[A-Za-z\s.-]+$/),
      ],
    ],

    grandFatherNameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[A-Za-z\s.-]+$/),
      ],
    ],

    familyNameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[A-Za-z\s.-]+$/),
      ],
    ],

    // Login ID must be provided and contain at least 3 characters.
    loginId: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
      ],
    ],

    // Temporary password: only used when adding a teacher (8+ characters).
    temporaryPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
      ],
    ],

    // Phone number must contain exactly 10 digits.
    phoneNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/),
      ],
    ],
  });


  constructor() {

    if (this.isEditMode()) {

      // The password is not edited here, so it is not required in edit mode.
      this.teacherForm.controls.temporaryPassword.clearValidators();
      this.teacherForm.controls.temporaryPassword.updateValueAndValidity();

      const id = this.teacherId();

      if (id) {
        this.loadTeacher(id);
      }
    }
  }


  // Loads the teacher and fills the form (edit mode only).
  private loadTeacher(teacherId: number): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.teachersService
      .getTeacher(teacherId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success || !response.data) {

            this.errorMessage.set(
              this.apiMessageService.getMessage(response) ||
              'TEACHERS.FORM.ERROR.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          const teacher = response.data;

          this.teacherForm.patchValue({
            firstNameAr: teacher.firstNameAr,
            fatherNameAr: teacher.fatherNameAr,
            grandFatherNameAr: teacher.grandFatherNameAr,
            familyNameAr: teacher.familyNameAr,

            firstNameEn: teacher.firstNameEn,
            fatherNameEn: teacher.fatherNameEn,
            grandFatherNameEn: teacher.grandFatherNameEn,
            familyNameEn: teacher.familyNameEn,

            loginId: teacher.loginId,
            phoneNumber: teacher.phoneNumber,
          });

          this.isLoading.set(false);
        },

        error: (error) => {

          console.error('Failed to load teacher:', error);

          this.errorMessage.set(
            'TEACHERS.FORM.ERROR.LOAD_FAILED'
          );

          this.isLoading.set(false);
        },
      });
  }


  // Handles teacher form submission.
  onSubmit(): void {

    this.errorMessage.set('');

    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    if (this.isEditMode()) {
      this.updateTeacher();
    } else {
      this.createTeacher();
    }
  }


  // Creates a new teacher (POST /api/teachers).
  private createTeacher(): void {

    const data: CreateTeacherRequest =
      this.teacherForm.getRawValue();

    this.teachersService
      .createTeacher(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.error(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.dialogRef.close({
            success: true,
            action: 'created',
          });

          this.actionResult.success(
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error) => {

          console.error('Failed to create teacher:', error);

          this.isSubmitting.set(false);

          this.actionResult.error(
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // Edits an existing teacher (PUT /api/teachers/{teacherId}).
  private updateTeacher(): void {

    const id = this.teacherId();

    if (!id) {
      this.errorMessage.set('TEACHERS.FORM.ERROR.INVALID_ID');
      this.isSubmitting.set(false);
      return;
    }

    const formValue = this.teacherForm.getRawValue();

    // The edit body is the same as creation without the password.
    const data: UpdateTeacherRequest = {
      firstNameAr: formValue.firstNameAr,
      fatherNameAr: formValue.fatherNameAr,
      grandFatherNameAr: formValue.grandFatherNameAr,
      familyNameAr: formValue.familyNameAr,

      firstNameEn: formValue.firstNameEn,
      fatherNameEn: formValue.fatherNameEn,
      grandFatherNameEn: formValue.grandFatherNameEn,
      familyNameEn: formValue.familyNameEn,

      loginId: formValue.loginId,
      phoneNumber: formValue.phoneNumber,
    };

    this.teachersService
      .updateTeacher(id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.error(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.dialogRef.close({
            success: true,
            action: 'updated',
          });

          this.actionResult.success(
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error) => {

          console.error('Failed to update teacher:', error);

          this.isSubmitting.set(false);

          this.actionResult.error(
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
    fieldName: keyof typeof this.teacherForm.controls
  ): boolean {

    const control =
      this.teacherForm.controls[fieldName];

    return control.invalid && control.touched;
  }
}
