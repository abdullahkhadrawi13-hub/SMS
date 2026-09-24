import {
  ChangeDetectionStrategy,
  Component,
  inject
} from '@angular/core';

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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../school-class';
import { SchoolClasses } from '../../../core/services/school-classes';

@Component({
  selector: 'app-class-form',
  standalone: true,
  imports: [
  ReactiveFormsModule,
  MatDialogModule,
  MatButtonModule,
  MatCheckboxModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatProgressSpinnerModule,
  TranslatePipe
],
  templateUrl: './class-form.html',
  styleUrl: './class-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassForm {

  private fb = inject(FormBuilder);
  private schoolClassesService = inject(SchoolClasses);

  private dialogRef = inject(
    MatDialogRef<ClassForm>
  );

  protected readonly data = inject(
    MAT_DIALOG_DATA
  ) as {
    mode: 'add' | 'edit';
    schoolClass?: SchoolClass;
  };

  protected readonly isEditMode = this.data.mode === 'edit';

  protected readonly form = this.fb.nonNullable.group({
    classNameAr: [
      this.data.schoolClass?.classNameAr ?? '',
      [Validators.required]
    ],

    classNameEn: [
      this.data.schoolClass?.classNameEn ?? '',
      [Validators.required]
    ],

    level: [
      this.data.schoolClass?.level ?? 1,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],

    isGraduationGrade: [
      this.data.schoolClass?.isGraduationGrade ?? false
    ]
  });

  protected isSaving = false;

  protected save(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    const formValue = this.form.getRawValue();

    const request = {
      classNameAr: formValue.classNameAr.trim(),
      classNameEn: formValue.classNameEn.trim(),
      level: formValue.level,
      isGraduationGrade: formValue.isGraduationGrade
    };

    if (this.isEditMode && this.data.schoolClass) {

      this.schoolClassesService
        .updateClass(
          this.data.schoolClass.schoolClassId,
          request
        )
        .subscribe({
          next: response => {
            this.dialogRef.close(response.data);
          },
          error: () => {
            this.isSaving = false;
          }
        });

      return;
    }

    this.schoolClassesService
      .createClass(request)
      .subscribe({
        next: response => {
          this.dialogRef.close(response.data);
        },
        error: () => {
          this.isSaving = false;
        }
      });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}