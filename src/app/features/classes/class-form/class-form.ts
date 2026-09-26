import { Component, inject } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

export interface ClassFormData {
  mode: 'add' | 'edit';

  classId?: number;
  sectionAr?: string;
  sectionEn?: string;
}

@Component({
  selector: 'app-class-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
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

  readonly data =
  inject<ClassFormData>(MAT_DIALOG_DATA, { optional: true }) ?? { mode: 'add' };

  readonly classForm = this.fb.group({

    classId: [
      this.data.classId ?? null,
      Validators.required
    ],

    sectionAr: [
      this.data.sectionAr ?? '',
      [
        Validators.required,
        Validators.maxLength(100)
      ]
    ],

    sectionEn: [
      this.data.sectionEn ?? '',
      [
        Validators.required,
        Validators.maxLength(100)
      ]
    ]

  });


  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }


  cancel(): void {
    this.dialogRef.close();
  }


  submit(): void {

    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.classForm.getRawValue());
  }

}