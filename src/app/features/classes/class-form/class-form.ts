import { Component, inject } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-class-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './class-form.html',
  styleUrl: './class-form.css'
})
export class ClassForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<ClassForm>);

  // Add Class Form
  readonly classForm = this.fb.group({

    classNameAr: [
      '',
      [
        Validators.required,
        Validators.maxLength(100)
      ]
    ],

    classNameEn: [
      '',
      [
        Validators.required,
        Validators.maxLength(100)
      ]
    ],

    isGraduationClass: [false]

  });

  // Disable Class Form
  readonly disableClassForm = this.fb.group({

    classId: [
      null,
      Validators.required
    ]

  });

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {

    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      action: 'add',
      data: this.classForm.getRawValue()
    });
  }

  disableClass(): void {

    if (this.disableClassForm.invalid) {
      this.disableClassForm.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      action: 'disable',
      data: this.disableClassForm.getRawValue()
    });
  }

}