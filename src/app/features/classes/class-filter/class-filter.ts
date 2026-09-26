import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

export interface ClassFilterData {
  classId?: number;
  sectionId?: number;
  isActive?: boolean;
  academicYearId?: number;
  academicTermId?: number;
}

@Component({
  selector: 'app-class-filter',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './class-filter.html',
  styleUrl: './class-filter.css'
})
export class ClassFilter {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<ClassFilter>);

  readonly data: ClassFilterData =
    inject<ClassFilterData>(MAT_DIALOG_DATA, { optional: true })
    ?? {};

  readonly filterForm = this.fb.group({

    classId: [
      this.data.classId ?? null
    ],

    sectionId: [
      this.data.sectionId ?? null
    ],

    isActive: [
      this.data.isActive ?? null
    ],

    academicYearId: [
      this.data.academicYearId ?? null
    ],

    academicTermId: [
      this.data.academicTermId ?? null
    ]

  });

  cancel(): void {
    this.dialogRef.close();
  }

  apply(): void {
    this.dialogRef.close(
      this.filterForm.getRawValue()
    );
  }

  clear(): void {
    this.filterForm.reset({
      classId: null,
      sectionId: null,
      isActive: null,
      academicYearId: null,
      academicTermId: null
    });
  }
}