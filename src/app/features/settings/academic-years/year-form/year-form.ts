import {
  Component,
  DestroyRef,
  ElementRef,
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
import { toEnglishDigits } from '../../../../shared/utils/english-digits';
import { requiredTextValidator } from '../../../../shared/utils/form-validators';

import {
  ConfirmDialog,
  ConfirmDialogData
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

import {
  endAfterStartValidator,
  errorsCountKey,
  fromApiDate,
  getDateLocale,
  LONG_DATE_FORMATS,
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

// "2025/2026": two four-digit years separated by "/".
const YEAR_NAME_FORMAT = /^\d{4}\/\d{4}$/;

// "2025/2026" is 9 characters.
const YEAR_NAME_MAX_LENGTH = 9;

type FieldName = 'startDate' | 'endDate' | 'yearName';


// Add / edit academic year dialog (navy & gold, 15 Nov 2026).
// It works like the class form:
//
//   - fixed header (title, one line, ✕), the body, fixed footer
//   - the layout and the fields use the shared look in styles.css
//     (.fd, .fd-head, .fd-body… and .field, .field-box, .field-box.is-date)
//   - closing with unsaved changes asks "Discard changes?" first
//     (backdrop click, Esc, ✕ and Cancel)
//   - saving with errors: every field is marked, the first wrong field
//     gets the focus, and the footer says how many need fixing
//   - the form sends the request itself, and closes only after a
//     successful save (the backend message shows in action-result-dialog)
//
// It is a plain dialog (not in the URL), opened by academic-years-page
// with panelClass 'form-dialog' (full screen on the phone).
@Component({
  selector: 'app-year-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  // The date picker needs a date adapter. It is provided here because a
  // dialog does not see the providers of the route that opened it.
  // The fields show the month name, like the page.
  providers: [
    provideNativeDateAdapter(LONG_DATE_FORMATS)
  ],
  templateUrl: './year-form.html',
  styleUrl: './year-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd'
  }
})
export class YearForm {

  readonly nameMaxLength = YEAR_NAME_MAX_LENGTH;

  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialog = inject(MatDialog);

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

  // True when the form edits an existing year.
  readonly isEditMode = !!this.data.year;

  // True while the request is being sent (prevents a double submit).
  readonly isSubmitting = signal(false);

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);

  readonly errorsCountKey = errorsCountKey;

  // The discard question is open (so a second Esc does not open another).
  private isConfirmingClose = false;

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

    // Kept as text so Arabic digits can be converted while typing.
    yearName: this.fb.nonNullable.control(
      this.data.year?.yearName ?? '',
      [
        requiredTextValidator,
        Validators.pattern(YEAR_NAME_FORMAT)
      ]
    )

  });

  private readonly fieldOrder: FieldName[] = ['startDate', 'endDate', 'yearName'];

  // The end date picker starts the day after the start date.
  readonly minEndDate = toSignal(
    this.yearForm.controls.startDate.valueChanges,
    { initialValue: this.yearForm.controls.startDate.value }
  );

  readonly nextDay = nextDay;

  constructor() {

    this.setUpClosing();

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

    // Keep the error count up to date while the user fixes the fields.
    this.yearForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    // Clearing the name starts it over (see isFieldInvalid).
    this.yearForm.controls.yearName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        if (value.trim() === '') {
          this.yearForm.controls.yearName.markAsUntouched();
        }
      });
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

    if (!this.yearForm.dirty) {
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
  // Year name
  // =========================

  // Arabic digits become English ones while typing or pasting (٢٠٢٨ → 2028),
  // so the user never sees an error for typing them.
  onYearNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const converted = toEnglishDigits(input.value);

    if (converted === input.value) {
      return;
    }

    // Same length, so the cursor stays where the user is typing.
    const cursor = input.selectionStart;

    input.value = converted;
    input.setSelectionRange(cursor, cursor);

    this.yearForm.controls.yearName.setValue(converted);
  }


  // =========================
  // Save
  // =========================

  // POST /api/academicyears (add) or PUT /api/academicyears/{id} (edit).
  submit(): void {
    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    if (this.yearForm.invalid) {
      this.yearForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      this.focusFirstInvalid();
      return;
    }

    const formValue = this.yearForm.getRawValue();

    // Same body for create and update.
    const request: CreateAcademicYearRequest & UpdateAcademicYearRequest = {
      yearName: formValue.yearName.trim(),
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


  // =========================
  // Errors
  // =========================

  // Fields that are still wrong.
  private countInvalid(): number {
    return this.fieldOrder
      .filter(name => this.yearForm.controls[name].invalid)
      .length;
  }

  // The first wrong field in the order it is shown, so the user starts there.
  // A date field cannot be typed in, so its calendar button gets the focus.
  private focusFirstInvalid(): void {
    const name = this.fieldOrder.find(
      field => this.yearForm.controls[field].invalid
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
  //   - an empty field (or a date not picked) says "required" only after
  //     pressing Add / Save, so moving through the fields shows no error
  //   - an end date before the start date shows at once (both were picked)
  //   - a year name in the wrong format shows when the user leaves the field
  //   - after pressing the button every error shows until it is fixed
  isFieldInvalid(fieldName: FieldName): boolean {
    const control = this.yearForm.controls[fieldName];

    if (!control.invalid) {
      return false;
    }

    if (this.submitAttempted()) {
      return true;
    }

    if (fieldName === 'endDate') {
      return control.hasError('endBeforeStart');
    }

    if (fieldName === 'yearName') {
      return control.touched && this.yearForm.controls.yearName.value.trim() !== '';
    }

    return false;
  }

  // The id of a field's error line (or its help line), for aria-describedby.
  describedBy(fieldName: FieldName, hasHelp = false): string | null {
    if (this.isFieldInvalid(fieldName)) {
      return `yf-${fieldName}-error`;
    }

    return hasHelp ? `yf-${fieldName}-help` : null;
  }

}
