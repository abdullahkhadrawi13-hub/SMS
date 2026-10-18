import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';

import {
  AcademicYear,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest
} from '../../../../core/models/academic-year';
import { AcademicYearsService } from '../../../../core/services/academic-years';
import { ApiResponse } from '../../../../core/models/api-response';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { ActionResult } from '../../../../shared/services/action-result';

import {
  endAfterStartValidator,
  fromApiDate,
  getDateLocale,
  nextDay,
  toApiDate
} from '../academic-years';

// Data passed to the dialog.
// No year = add mode, a year = edit mode.
export interface YearFormData {
  year?: AcademicYear;
}

// Value returned when the dialog closes after a successful save.
export interface YearFormResult {
  success: true;
  action: 'created' | 'updated';
}

@Component({
  selector: 'app-year-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe
  ],
  // The date picker needs a date adapter. It is provided here because a
  // dialog does not see the providers of the route that opened it.
  providers: [
    provideNativeDateAdapter()
  ],
  templateUrl: './year-form.html',
  styleUrl: './year-form.css'
})
export class YearForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<YearForm, YearFormResult>);

  private readonly yearsService = inject(AcademicYearsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  private readonly destroyRef = inject(DestroyRef);

  readonly data =
    inject<YearFormData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  // True while the request is being sent (prevents a double submit).
  readonly isSubmitting = signal(false);

  // Created before the form, so the end date validator can read it.
  private readonly startDateControl = new FormControl<Date | null>(
    this.data.year ? fromApiDate(this.data.year.startDate) : null,
    [Validators.required]
  );

  readonly yearForm = this.fb.group({

    startDate: this.startDateControl,

    endDate: [
      this.data.year ? fromApiDate(this.data.year.endDate) : null as Date | null,
      [
        Validators.required,
        endAfterStartValidator(() => this.startDateControl.value)
      ]
    ],

    // "2025/2026": two four-digit years separated by "/".
    yearName: [
      this.data.year?.yearName ?? '',
      [
        Validators.required,
        Validators.pattern(/^\d{4}\/\d{4}$/)
      ]
    ]

  });

  // The end date picker starts the day after the start date.
  readonly minEndDate = toSignal(
    this.yearForm.controls.startDate.valueChanges,
    { initialValue: this.yearForm.controls.startDate.value }
  );

  readonly nextDay = nextDay;

  constructor() {

    // Calendar in the current language (Arabic month names, Latin digits).
    this.dateAdapter.setLocale(
      getDateLocale(this.language.currentDirection() === 'rtl')
    );

    // A new start date may make the end date valid or invalid.
    this.yearForm.controls.startDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        this.yearForm.controls.endDate.updateValueAndValidity()
      );
  }

  get isEditMode(): boolean {
    return !!this.data.year;
  }

  // Shows a field's error only after the user touched it or pressed save.
  isFieldInvalid(field: 'startDate' | 'endDate' | 'yearName'): boolean {
    const control = this.yearForm.controls[field];

    return control.invalid && (control.touched || control.dirty);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {

    if (this.yearForm.invalid) {
      this.yearForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    const formValue = this.yearForm.getRawValue();

    // Same body for create and update.
    const request: CreateAcademicYearRequest & UpdateAcademicYearRequest = {
      yearName: (formValue.yearName ?? '').trim(),
      startDate: toApiDate(formValue.startDate as Date),
      endDate: toApiDate(formValue.endDate as Date)
    };

    const year = this.data.year;

    const request$: Observable<ApiResponse<unknown>> = year
      ? this.yearsService.updateAcademicYear(year.academicYearId, request)
      : this.yearsService.createAcademicYear(request);

    this.isSubmitting.set(true);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          // Business error (e.g. duplicate year name):
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
          console.error('Failed to save academic year:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }

}
