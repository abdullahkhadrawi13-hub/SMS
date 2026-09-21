import {
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

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
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  Students,
  CreateStudentRequest,
  StudentRequest
} from '../../../core/services/students';

export interface StudentFormDialogData {
  studentId?: number;
}

@Component({
  selector: 'app-student-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,

    TranslatePipe
  ],
  templateUrl: './student-form.html',
  styleUrl: './student-form.css'
})
export class StudentForm {

  private readonly fb = inject(FormBuilder);
  private readonly studentsService = inject(Students);
  private readonly dialogRef = inject(MatDialogRef<StudentForm>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogData =
    inject<StudentFormDialogData>(MAT_DIALOG_DATA);

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly studentId = signal<number | null>(
    this.dialogData?.studentId ?? null
  );

  readonly isEditMode = signal(
    !!this.dialogData?.studentId
  );

  readonly studentForm = this.fb.nonNullable.group({

    firstNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    fatherNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    grandFatherNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    familyNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    firstNameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    fatherNameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    grandFatherNameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    familyNameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    loginId: [
      '',
      [
        Validators.required,
        Validators.minLength(3)
      ]
    ],

    temporaryPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(6)
      ]
    ],

    phoneNumber: [
      '',
      [
        Validators.required
      ]
    ],

    classId: [
      0,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],

    sectionId: [
      0,
      [
        Validators.required,
        Validators.min(1)
      ]
    ]

  });


  constructor() {

    if (this.isEditMode()) {

      const id = this.studentId();

      if (id) {
        this.loadStudent(id);
      }

      this.studentForm.controls.temporaryPassword.clearValidators();

      this.studentForm.controls.temporaryPassword.updateValueAndValidity();
    }

  }


  private loadStudent(studentId: number): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.studentsService
      .getStudent(studentId)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          if (!response.success || !response.data) {

            this.errorMessage.set(
              response.message ||
              'STUDENTS_FORM.ERROR.LOAD_FAILED'
            );

            this.isLoading.set(false);

            return;
          }

          const student = response.data;

          this.studentForm.patchValue({

            firstNameAr: student.firstNameAr,
            fatherNameAr: student.fatherNameAr,
            grandFatherNameAr: student.grandFatherNameAr,
            familyNameAr: student.familyNameAr,

            firstNameEn: student.firstNameEn,
            fatherNameEn: student.fatherNameEn,
            grandFatherNameEn: student.grandFatherNameEn,
            familyNameEn: student.familyNameEn,

            loginId: student.loginId,
            phoneNumber: student.phoneNumber,

            classId: student.classId,
            sectionId: student.sectionId

          });

          this.isLoading.set(false);

        },

        error: error => {

          console.error(
            'Failed to load student:',
            error
          );

          this.errorMessage.set(
            'STUDENTS_FORM.ERROR.LOAD_FAILED'
          );

          this.isLoading.set(false);

        }

      });

  }


  onSubmit(): void {

    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.studentForm.invalid) {

      this.studentForm.markAllAsTouched();

      return;
    }

    this.isSubmitting.set(true);

    if (this.isEditMode()) {

      this.updateStudent();

    } else {

      this.createStudent();

    }

  }


  private createStudent(): void {

    const formValue =
      this.studentForm.getRawValue();

    const data: CreateStudentRequest = {

      firstNameAr: formValue.firstNameAr,
      fatherNameAr: formValue.fatherNameAr,
      grandFatherNameAr: formValue.grandFatherNameAr,
      familyNameAr: formValue.familyNameAr,

      firstNameEn: formValue.firstNameEn,
      fatherNameEn: formValue.fatherNameEn,
      grandFatherNameEn: formValue.grandFatherNameEn,
      familyNameEn: formValue.familyNameEn,

      loginId: formValue.loginId,
      temporaryPassword: formValue.temporaryPassword,

      phoneNumber: formValue.phoneNumber,

      classId: formValue.classId,
      sectionId: formValue.sectionId

    };


    this.studentsService
      .createStudent(data)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          if (!response.success) {

            this.errorMessage.set(
              response.message
            );

            this.isSubmitting.set(false);

            return;
          }

          this.successMessage.set(
            'STUDENTS_FORM.SUCCESS.CREATED'
          );

          this.isSubmitting.set(false);

          setTimeout(() => {

            this.dialogRef.close({
              success: true,
              action: 'created'
            });

          }, 700);

        },

        error: error => {

          console.error(
            'Failed to create student:',
            error
          );

          this.errorMessage.set(
            'STUDENTS_FORM.ERROR.CREATE_FAILED'
          );

          this.isSubmitting.set(false);

        }

      });

  }


  private updateStudent(): void {

    const id = this.studentId();

    if (!id) {

      this.errorMessage.set(
        'STUDENTS_FORM.ERROR.INVALID_ID'
      );

      this.isSubmitting.set(false);

      return;
    }

    const formValue =
      this.studentForm.getRawValue();

    const data: StudentRequest = {

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

      classId: formValue.classId,
      sectionId: formValue.sectionId

    };


    this.studentsService
      .updateStudent(id, data)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          if (!response.success) {

            this.errorMessage.set(
              response.message
            );

            this.isSubmitting.set(false);

            return;
          }

          this.successMessage.set(
            'STUDENTS_FORM.SUCCESS.UPDATED'
          );

          this.isSubmitting.set(false);

          setTimeout(() => {

            this.dialogRef.close({
              success: true,
              action: 'updated'
            });

          }, 700);

        },

        error: error => {

          console.error(
            'Failed to update student:',
            error
          );

          this.errorMessage.set(
            'STUDENTS_FORM.ERROR.UPDATE_FAILED'
          );

          this.isSubmitting.set(false);

        }

      });

  }


  cancel(): void {

    this.dialogRef.close();

  }


  isFieldInvalid(
    fieldName: keyof typeof this.studentForm.controls
  ): boolean {

    const control =
      this.studentForm.controls[fieldName];

    return control.invalid && control.touched;

  }

}