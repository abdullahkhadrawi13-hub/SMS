import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { filter, map, Observable, of, tap } from 'rxjs';

import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { TranslatePipe } from '@ngx-translate/core';
import { TERM_NAME_MAX_LENGTH } from '../../../../shared/constants/field-lengths';

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
import { toEnglishDigits } from '../../../../shared/utils/english-digits';
import { requiredTextValidator } from '../../../../shared/utils/form-validators';

import {
  ConfirmDialog,
  ConfirmDialogData
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

import {
  endAfterStartValidator,
  errorsCountKey,
  formatLongDate,
  fromApiDate,
  getDateLocale,
  LONG_DATE_FORMATS,
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

// Arabic letters, digits, spaces, dots and dashes (same rule as classes).
const ARABIC_TERM_NAME = /^[؀-ۿ0-9\s.-]+$/;

// English letters, digits, spaces, dots and dashes (same rule as classes).
const ENGLISH_TERM_NAME = /^[A-Za-z0-9\s.-]+$/;

// The term number is a small whole number: 2 digits are more than enough.
const TERM_NUMBER_MAX_DIGITS = 2;

type FieldName = 'termNumber' | 'nameAr' | 'nameEn' | 'startDate' | 'endDate';


// Add / edit term dialog (navy & gold, 15 Nov 2026).
// It works like the class form and the year form:
//
//   - fixed header: the title, and the year (with its dates) under it
//   - three sections: the term (number + both names), the period (the
//     two dates, and the year's other terms under them), the status
//     (the "Active term" switch; locked on the current term)
//   - the layout and the fields use the shared look in styles.css
//   - closing with unsaved changes asks "Discard changes?" first
//   - saving with errors: every field is marked, the first wrong field
//     gets the focus, and the footer says how many need fixing
//   - closes only after a successful save (backend message in
//     action-result-dialog)
//
// It is a plain dialog (not in the URL), opened by academic-years-page
// with panelClass 'form-dialog' (full screen on the phone).
@Component({
  selector: 'app-term-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    TranslatePipe
  ],
  // The date picker needs a date adapter. It is provided here because a
  // dialog does not see the providers of the route that opened it.
  // The fields show the month name, like the page.
  providers: [
    provideNativeDateAdapter(LONG_DATE_FORMATS)
  ],
  templateUrl: './term-form.html',
  styleUrl: './term-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd'
  }
})
export class TermForm {

  // Max length for the term names (same limit as the backend).
  readonly nameMaxLength = TERM_NAME_MAX_LENGTH;
  readonly numberMaxDigits = TERM_NUMBER_MAX_DIGITS;

  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialog = inject(MatDialog);

  private readonly dialogRef =
    inject(MatDialogRef<TermForm, TermFormResult>);

  private readonly termsService = inject(AcademicTermsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<TermFormData>(MAT_DIALOG_DATA);

  // True when the form edits an existing term.
  readonly isEditMode = !!this.data.term;

  // The current term can never be deactivated, so its switch is locked.
  readonly isCurrentTerm = !!this.data.term?.isCurrent;

  // True while the request is being sent (prevents a double submit).
  readonly isSubmitting = signal(false);

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);

  readonly errorsCountKey = errorsCountKey;

  // The discard question is open (so a second Esc does not open another).
  private isConfirmingClose = false;

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
    // Kept as text so Arabic digits can be converted while typing.
    termNumber: this.fb.nonNullable.control(
      this.data.term ? String(this.data.term.termNumber) : '',
      [
        requiredTextValidator,
        Validators.pattern(/^\d+$/),
        Validators.min(1)
      ]
    ),

    nameAr: this.fb.nonNullable.control(
      this.data.term?.nameAr ?? '',
      [
        requiredTextValidator,
        Validators.maxLength(TERM_NAME_MAX_LENGTH),
        Validators.pattern(ARABIC_TERM_NAME)
      ]
    ),

    nameEn: this.fb.nonNullable.control(
      this.data.term?.nameEn ?? '',
      [
        requiredTextValidator,
        Validators.maxLength(TERM_NAME_MAX_LENGTH),
        Validators.pattern(ENGLISH_TERM_NAME)
      ]
    ),

    startDate: this.startDateControl,

    endDate: [
      this.data.term ? fromApiDate(this.data.term.endDate) : null as Date | null,
      [
        Validators.required,
        endAfterStartValidator(() => this.startDateControl.value)
      ]
    ],

    isActive: [
      {
        value: this.data.term?.isActive ?? true,
        disabled: this.isCurrentTerm
      }
    ]

  });

  private readonly fieldOrder: FieldName[] =
    ['termNumber', 'nameAr', 'nameEn', 'startDate', 'endDate'];

  // The typed text fields (clearing one starts it over).
  private readonly textControls = [
    this.termForm.controls.termNumber,
    this.termForm.controls.nameAr,
    this.termForm.controls.nameEn
  ];

  // The end date picker starts the day after the start date.
  readonly minEndDate = toSignal(
    this.termForm.controls.startDate.valueChanges,
    { initialValue: this.termForm.controls.startDate.value }
  );

  readonly nextDay = nextDay;

  // The year's date range, in the line under the title.
  readonly yearRange = computed(() => {
    const { year } = this.data;
    const isArabic = this.isArabic();

    return `${formatLongDate(year.startDate, isArabic)} — ${formatLongDate(year.endDate, isArabic)}`;
  });

  // The other terms of the year (the edited term is left out),
  // e.g. "الفصل الأول  1 أيلول 2026 — 14 كانون الثاني 2027".
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

    this.setUpClosing();

    // Calendar in the current language (Arabic month names, Latin digits).
    this.dateAdapter.setLocale(getDateLocale(this.isArabic()));

    // A new start date may make the end date valid or invalid.
    this.termForm.controls.startDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        this.termForm.controls.endDate.updateValueAndValidity()
      );

    // Keep the error count up to date while the user fixes the fields.
    this.termForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    // Clearing a text field starts it over: it goes back to "not touched",
    // so typing again shows a "leave the field" error only on leaving it.
    for (const control of this.textControls) {
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(value => {
          if (value.trim() === '') {
            control.markAsUntouched();
          }
        });
    }
  }


  // =========================
  // Closing
  // =========================

  // Backdrop click and Esc do not close the dialog by themselves:
  // they go through requestClose(), which asks first when something changed.
  private setUpClosing(): void {
    this.dialogRef.disableClose = true;

    this.dialogRef
      .backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.requestClose());

    this.dialogRef
      .keydownEvents()
      .pipe(
        filter(event => event.key === 'Escape'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        event.preventDefault();
        this.requestClose();
      });
  }

  // ✕, Cancel, backdrop click and Esc.
  requestClose(): void {
    this.confirmDiscard().subscribe(canClose => {
      if (canClose) {
        this.dialogRef.close();
      }
    });
  }

  // May the form close now?
  //   - true straight away when nothing was changed
  //   - otherwise asks "Discard changes?": true on "Discard changes"
  //   - false while saving, or while the question is already open
  private confirmDiscard(): Observable<boolean> {
    if (this.isSubmitting() || this.isConfirmingClose) {
      return of(false);
    }

    if (!this.termForm.dirty) {
      return of(true);
    }

    this.isConfirmingClose = true;

    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data: {
          icon: 'edit_note',
          titleKey: 'ACADEMIC_YEARS.DISCARD.TITLE',
          messageKey: 'ACADEMIC_YEARS.DISCARD.MESSAGE',
          confirmKey: 'ACADEMIC_YEARS.DISCARD.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .pipe(
        tap(() => (this.isConfirmingClose = false)),
        map(confirmed => confirmed === true)
      );
  }


  // =========================
  // Term number
  // =========================

  // Arabic digits become English ones while typing or pasting (٢ → 2),
  // so the user never sees an error for typing them.
  onNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const converted = toEnglishDigits(input.value);

    if (converted === input.value) {
      return;
    }

    // Same length, so the cursor stays where the user is typing.
    const cursor = input.selectionStart;

    input.value = converted;
    input.setSelectionRange(cursor, cursor);

    this.termForm.controls.termNumber.setValue(converted);
  }


  // =========================
  // Save
  // =========================

  // POST /api/academicterms (add) or PUT /api/academicterms/{id} (edit).
  submit(): void {
    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    if (this.termForm.invalid) {
      this.termForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      this.focusFirstInvalid();
      return;
    }

    // getRawValue: includes isActive even when the switch is locked.
    const formValue = this.termForm.getRawValue();

    const body: UpdateAcademicTermRequest = {
      termNumber: Number(formValue.termNumber),
      nameAr: formValue.nameAr.trim(),
      nameEn: formValue.nameEn.trim(),
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


  // =========================
  // Errors
  // =========================

  // Fields that are still wrong.
  private countInvalid(): number {
    return this.fieldOrder
      .filter(name => this.termForm.controls[name].invalid)
      .length;
  }

  // The first wrong field in the order it is shown, so the user starts there.
  private focusFirstInvalid(): void {
    const name = this.fieldOrder.find(
      field => this.termForm.controls[field].invalid
    );

    if (!name) {
      return;
    }

    const element = this.host.nativeElement.querySelector<HTMLElement>(
      `[data-field="${name}"]`
    );

    element?.focus();
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // When a field shows its error (the same rules as the class form):
  //   - a wrong kind of character (English letters in the Arabic name,
  //     Arabic letters in the English one, a letter in the number)
  //     shows at once, while typing
  //   - a term number of 0 shows when the user leaves the field
  //   - an end date before the start date shows at once (both were picked)
  //   - an empty field (or a date not picked) says "required" only after
  //     pressing Add / Save, so moving through the fields shows no error
  //   - after pressing the button every error shows until it is fixed
  isFieldInvalid(fieldName: FieldName): boolean {
    const control = this.termForm.controls[fieldName];

    if (!control.invalid) {
      return false;
    }

    if (this.submitAttempted()) {
      return true;
    }

    if (fieldName === 'startDate') {
      return false;
    }

    if (fieldName === 'endDate') {
      return control.hasError('endBeforeStart');
    }

    if (control.hasError('pattern')) {
      return true;
    }

    const value = this.termForm.controls[fieldName].value;

    return control.touched && value.trim() !== '';
  }

  // The id of a field's error line (or its help line), for aria-describedby.
  describedBy(fieldName: FieldName): string | null {
    return this.isFieldInvalid(fieldName) ? `tf-${fieldName}-error` : null;
  }

}
