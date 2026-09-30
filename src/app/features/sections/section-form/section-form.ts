import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClassesService } from '../../../core/services/school-classes';
import { SchoolClassSimpleDto } from '../../classes/school-class';

export interface SectionFormData {
  mode: 'add' | 'edit';

  classId?: number;
  classNameAr?: string;
  classNameEn?: string;
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
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './section-form.html',
  styleUrl: './section-form.css'
})
export class SectionForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<SectionForm>);

  private readonly classesService = inject(SchoolClassesService);
  private readonly destroyRef = inject(DestroyRef);

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

  // الصفوف النشطة فقط (من GET /api/SchoolClasses/active)
  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly isLoadingClasses = signal(false);

  constructor() {
    // الـ API لا يسمح بتغيير صف الشعبة عند التعديل (UpdateSectionRequest بدون classId)
    if (this.isEditMode) {
      this.sectionForm.controls.classId.disable();
    }

    this.loadClasses();
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  private loadClasses(): void {
    this.isLoadingClasses.set(true);

    this.classesService
      .getActiveSchoolClasses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.classes.set(response.success ? response.data : []);
          this.isLoadingClasses.set(false);
        },
        error: error => {
          console.error('Failed to load classes:', error);
          this.classes.set([]);
          this.isLoadingClasses.set(false);
        }
      });
  }

  isArabic(): boolean {
    return document.documentElement.lang === 'ar';
  }

  getClassName(c: SchoolClassSimpleDto): string {
    return this.isArabic() ? c.classNameAr : c.classNameEn;
  }

  // في التعديل: إن كان صف الشعبة غير نشط فلن يظهر في القائمة، فنعرض اسمه من البيانات الممرّرة
  get fallbackClassName(): string | null {
    const id = this.data.classId;

    if (!this.isEditMode || !id) return null;
    if (this.classes().some(c => c.schoolClassId === id)) return null;

    return (this.isArabic() ? this.data.classNameAr : this.data.classNameEn) ?? null;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {

    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }

    // getRawValue يشمل classId حتى وهو معطّل في وضع التعديل
    this.dialogRef.close(this.sectionForm.getRawValue());
  }

}