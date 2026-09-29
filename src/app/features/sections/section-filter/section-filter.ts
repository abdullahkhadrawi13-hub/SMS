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

export interface SectionFilterData {
  classId?: number;
  sectionId?: number;
  isActive?: boolean;
  academicYearId?: number;
  academicTermId?: number;
}

@Component({
  selector: 'app-section-filter',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './section-filter.html',
  styleUrl: './section-filter.css'
})
export class SectionFilter {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<SectionFilter>);

  readonly data: SectionFilterData =
    inject<SectionFilterData>(MAT_DIALOG_DATA, { optional: true })
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