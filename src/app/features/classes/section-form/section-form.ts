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

export interface SectionFormData {
  mode: 'add' | 'edit';

  classId?: number;
  sectionAr?: string;
  sectionEn?: string;
}

@Component({
  selector: 'app-section-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './section-form.html',
  styleUrl: './section-form.css'
})
export class SectionForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<SectionForm>);

  readonly data =
    inject<SectionFormData>(MAT_DIALOG_DATA, { optional: true })
    ?? { mode: 'add' };

  readonly sectionForm = this.fb.group({

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

    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.sectionForm.getRawValue());
  }

}