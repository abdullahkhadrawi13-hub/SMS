import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { SectionsService } from '../../../../core/services/sections';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { ActionResult } from '../../../../shared/services/action-result';

// Data passed to the dialog.
// The class is the page's class (shown locked: a section never moves
// to another class). No section = add mode, a section = edit mode.
export interface SectionFormData {
  schoolClass: SchoolClass;
  section: Section | null;
}

// Value returned when the dialog closes after a successful save.
export interface SectionFormResult {
  success: true;
  action: 'created' | 'updated';
}

@Component({
  selector: 'app-sections-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe
  ],
  templateUrl: './sections-form.html',
  styleUrl: './sections-form.css'
})
export class SectionsForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<SectionsForm, SectionFormResult>);

  private readonly sectionsService = inject(SectionsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<SectionFormData>(MAT_DIALOG_DATA);

  // True while the request is being sent (prevents a double submit).
  readonly isSubmitting = signal(false);

  readonly sectionForm = this.fb.nonNullable.group({

    // Arabic letters, digits, spaces, dots and dashes (e.g. "أ", "الشعبة 1").
    sectionAr: [
      this.data.section?.sectionAr ?? '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[؀-ۿ0-9\s.-]+$/)
      ]
    ],

    // English letters, digits, spaces, dots and dashes (e.g. "A", "Section 1").
    sectionEn: [
      this.data.section?.sectionEn ?? '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[A-Za-z0-9\s.-]+$/)
      ]
    ]

  });

  get isEditMode(): boolean {
    return !!this.data.section;
  }

  // The (locked) class name in the current language.
  get className(): string {
    return this.language.currentDirection() === 'rtl'
      ? this.data.schoolClass.classNameAr
      : this.data.schoolClass.classNameEn;
  }

  // Shows a field's error only after the user touched it or pressed save.
  isFieldInvalid(field: 'sectionAr' | 'sectionEn'): boolean {
    const control = this.sectionForm.controls[field];

    return control.invalid && (control.touched || control.dirty);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  // POST /api/sections (add) or PUT /api/sections/{id} (edit: names only).
  submit(): void {

    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    const formValue = this.sectionForm.getRawValue();

    const names = {
      sectionAr: formValue.sectionAr.trim(),
      sectionEn: formValue.sectionEn.trim()
    };

    const section = this.data.section;

    const request$ = section
      ? this.sectionsService.updateSection(section.sectionId, names)
      : this.sectionsService.createSection({
          classId: this.data.schoolClass.schoolClassId,
          ...names
        });

    this.isSubmitting.set(true);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          // Business error (e.g. the name already exists in this class):
          // keep the dialog open so the user can fix the value.
          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.dialogRef.close({
            success: true,
            action: this.isEditMode ? 'updated' : 'created'
          });

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to save section:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }

}
