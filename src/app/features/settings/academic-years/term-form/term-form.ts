import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicYear } from '../../../../core/models/academic-year';
import {
  AcademicTerm,
  CreateAcademicTermRequest,
  UpdateAcademicTermRequest
} from '../../../../core/models/academic-term';
import { AcademicTermsService } from '../../../../core/services/academic-terms';
import { ApiResponse } from '../../../../core/models/api-response';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { ActionResult } from '../../../../shared/services/action-result';

import {
  endAfterStartValidator,
  formatLongDate,
  fromApiDate,
  getDateLocale,
  nextDay,
  toApiDate
} from '../academic-years';

// Data passed to the dialog.
// The year comes from the card the user clicked (it cannot be changed).
// yearTerms: the terms the year already has (shown to help avoid overlaps).
// No term = add mode, a term = edit mode.
export interface TermFormData {
  year: AcademicYear;
  yearTerms: AcademicTerm[];
  term?: AcademicTerm;
}

// Value returned when the dialog closes after a successful save.
export interface TermFormResult {
  success: true;
  action: 'created' | 'updated';
}

@Component({
  selector: 'app-term-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    TranslatePipe
  ],
  // The date picker needs a date adapter. It is provided here because a
  // dialog does not see the providers of the route that opened it.
  providers: [
    provideNativeDateAdapter()
  ],
  templateUrl: './term-form.html',
  styleUrl: './term-form.css'
})
export class TermForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<TermForm, TermFormResult>);

  private readonly termsService = inject(AcademicTermsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<TermFormData>(MAT_DIALOG_DATA);

  // True while the request is being sent (prevents a double submit).
  readonly isSubmitting = signal(false);

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Created before the form, so the end date validator can read it.
  private readonly startDateControl = new FormControl<Date | null>(
    this.data.term ? fromApiDate(this.data.term.startDate) : null,
    [Validators.required]
  );

  readonly termForm = this.fb.group({

    // A whole number above 0 (the backend checks it is unique in the year).
    termNumber: [
      this.data.term?.termNumber ?? (null as number | null),
      [
        Validators.required,
        Validators.min(1),
        Validators.pattern(/^\d+$/)
      ]
    ],

    // Arabic letters, digits, spaces, dots and dashes (same rule as classes).
    nameAr: [
      this.data.term?.nameAr ?? '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[؀-ۿ0-9\s.-]+$/)
      ]
    ],

    // English letters, digits, spaces, dots and dashes (same rule as classes).
    nameEn: [
      this.data.term?.nameEn ?? '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[A-Za-z0-9\s.-]+$/)
      ]
    ],

    startDate: this.startDateControl,

    endDate: [
      this.data.term ? fromApiDate(this.data.term.endDate) : null as Date | null,
      [
        Validators.required,
        endAfterStartValidator(() => this.startDateControl.value)
      ]
    ],

    // The current term can never be deactivated, so the switch is locked on it.
    isActive: [
      {
        value: this.data.term?.isActive ?? true,
        disabled: !!this.data.term?.isCurrent
      }
    ]

  });

  // The end date picker starts the day after the start date.
  readonly minEndDate = toSignal(
    this.termForm.controls.startDate.valueChanges,
    { initialValue: this.termForm.controls.startDate.value }
  );

  readonly nextDay = nextDay;

  // The year's date range, in the box at the top.
  readonly yearRange = computed(() => {
    const { year } = this.data;
    const isArabic = this.isArabic();

    return `${formatLongDate(year.startDate, isArabic)} — ${formatLongDate(year.endDate, isArabic)}`;
  });

  // The other terms of the year (the edited term is left out),
  // e.g. "الفصل الأول: 1 أيلول 2026 — 14 كانون الثاني 2027".
  readonly otherTerms = computed(() => {
    const isArabic = this.isArabic();
    const editedId = this.data.term?.academicTermId;

    return this.data.yearTerms
      .filter(term => term.academicTermId !== editedId)
      .map(term => ({
        id: term.academicTermId,
        name: isArabic ? term.nameAr : term.nameEn,
        range: `${formatLongDate(term.startDate, isArabic)} — ${formatLongDate(term.endDate, isArabic)}`
      }));
  });

  constructor() {

    // Calendar in the current language (Arabic month names, Latin digits).
    this.dateAdapter.setLocale(getDateLocale(this.isArabic()));

    // A new start date may make the end date valid or invalid.
    this.termForm.controls.startDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        this.termForm.controls.endDate.updateValueAndValidity()
      );
  }

  get isEditMode(): boolean {
    return !!this.data.term;
  }

  get isCurrentTerm(): boolean {
    return !!this.data.term?.isCurrent;
  }

  // Shows a field's error only after the user touched it or pressed save.
  isFieldInvalid(
    field: 'termNumber' | 'nameAr' | 'nameEn' | 'startDate' | 'endDate'
  ): boolean {
    const control = this.termForm.controls[field];

    return control.invalid && (control.touched || control.dirty);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {

    if (this.termForm.invalid) {
      this.termForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    // getRawValue: includes isActive even when the switch is locked.
    const formValue = this.termForm.getRawValue();

    const body: UpdateAcademicTermRequest = {
      termNumber: Number(formValue.termNumber),
      nameAr: (formValue.nameAr ?? '').trim(),
      nameEn: (formValue.nameEn ?? '').trim(),
      startDate: toApiDate(formValue.startDate as Date),
      endDate: toApiDate(formValue.endDate as Date),
      isActive: !!formValue.isActive
    };

    const term = this.data.term;

    // academicYearId is sent only on create.
    const createRequest: CreateAcademicTermRequest = {
      academicYearId: this.data.year.academicYearId,
      ...body
    };

    const request$: Observable<ApiResponse<unknown>> = term
      ? this.termsService.updateAcademicTerm(term.academicTermId, body)
      : this.termsService.createAcademicTerm(createRequest);

    this.isSubmitting.set(true);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          // Business error (e.g. overlapping dates, duplicate number):
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
          console.error('Failed to save academic term:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }

}
