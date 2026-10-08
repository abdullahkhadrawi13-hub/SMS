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
  selector: 'app-subjects-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
    MatIcon,
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


  // Subject form fields and validation rules.
  readonly subjectForm = this.fb.nonNullable.group({

    // Arabic subject name.
    nameAr: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[\u0600-\u06FF\s.-]+$/),
      ],
    ],

    // English subject name.
    nameEn: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[A-Za-z\s.-]+$/),
      ],
    ],
  });


  // Handles subject form submission.
  onSubmit(): void {

    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();
      return;
    }

    // API integration will be added later.
    console.log(
      'Subject form value:',
      this.subjectForm.getRawValue()
    );
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