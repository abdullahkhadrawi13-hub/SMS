import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-teacher-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
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

  // Teacher form fields and validation rules.
  readonly teacherForm = this.fb.nonNullable.group({

    // Arabic name fields: allow Arabic letters, spaces, dots, and hyphens.
    firstNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[\u0600-\u06FF\s.-]+$/),
      ],
    ],

    fatherNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[\u0600-\u06FF\s.-]+$/),
      ],
    ],

    grandFatherNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[\u0600-\u06FF\s.-]+$/),
      ],
    ],

    familyNameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[\u0600-\u06FF\s.-]+$/),
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

    // Phone number must contain exactly 10 digits.
    phoneNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/),
      ],
    ],
  });

  // Handles teacher form submission.
  onSubmit(): void {

    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      return;
    }

    // API integration will be added when Teacher endpoints are ready.
    console.log(
      'Teacher form value:',
      this.teacherForm.getRawValue()
    );
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