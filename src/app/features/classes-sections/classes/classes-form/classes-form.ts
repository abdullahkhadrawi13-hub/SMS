import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { filter, map, Observable, of, tap } from 'rxjs';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { TranslatePipe } from '@ngx-translate/core';

import {
  SchoolClass,
  CreateSchoolClassRequest,
  UpdateSchoolClassRequest
} from '../../../../core/models/school-class';
import { SchoolClassesService } from '../../../../core/services/school-classes';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { ActionResult } from '../../../../shared/services/action-result';
import { toEnglishDigits } from '../../../../shared/utils/english-digits';
import { requiredTextValidator } from '../../../../shared/utils/form-validators';

import {
  PlanConfirmData,
  PlanConfirmDialog
} from '../../../subjects/subject-plans/plan-confirm-dialog/plan-confirm-dialog';


// Data passed to the dialog.
// No schoolClass = add mode, a schoolClass = edit mode.
export interface ClassFormData {
  schoolClass?: SchoolClass;
}

// Value returned when the dialog closes after a successful save.
export interface ClassFormResult {
  success: true;
  action: 'created' | 'updated';
}


// The longest class name (the same limit as the backend).
const CLASS_NAME_MAX_LENGTH = 100;

// The level is a small whole number: 3 digits are more than enough.
const LEVEL_MAX_DIGITS = 3;

// Arabic letters, digits (e.g. "الصف 10"), spaces, dots and dashes.
const ARABIC_CLASS_NAME = /^[؀-ۿ0-9\s.-]+$/;

// English letters, digits (e.g. "Grade 10"), spaces, dots and dashes.
const ENGLISH_CLASS_NAME = /^[A-Za-z0-9\s.-]+$/;


// The name of one of the form's text controls.
type FieldName = 'classNameAr' | 'classNameEn' | 'level';


// Add / edit class dialog (navy & gold, 12 Nov 2026).
// It works like the student and teacher forms, in a small size:
//
//   - fixed header (title, one line, ✕), the body, fixed footer
//   - the layout and the fields use the shared look in styles.css
//     (.fd, .fd-head, .fd-body… and .field, .field-box…)
//   - closing with unsaved changes asks "Discard changes?" first
//     (backdrop click, Esc, ✕ and Cancel)
//   - saving with errors: every field is marked, the first wrong field
//     gets the focus, and the footer says how many need fixing
//   - the form sends the request itself, and closes only after a
//     successful save (the backend message shows in action-result-dialog)
//
// Unlike those two forms it is not in the URL: it is a plain dialog.
// It is opened by classes-page and class-sections-page with
// panelClass 'form-dialog' (full screen on the phone, see styles.css).
@Component({
  selector: 'app-classes-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    TranslatePipe
  ],
  templateUrl: './classes-form.html',
  styleUrl: './classes-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd'
  }
})
export class ClassesForm {

  readonly nameMaxLength = CLASS_NAME_MAX_LENGTH;
  readonly levelMaxDigits = LEVEL_MAX_DIGITS;

  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialog = inject(MatDialog);

  private readonly dialogRef =
    inject(MatDialogRef<ClassesForm, ClassFormResult>);

  private readonly classesService = inject(SchoolClassesService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);

  readonly data =
    inject<ClassFormData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  // True when the form edits an existing class.
  readonly isEditMode = !!this.data.schoolClass;

  // Edit header line: the class name in the UI language.
  readonly className = computed(() => {
    const schoolClass = this.data.schoolClass;

    if (!schoolClass) {
      return '';
    }

    return this.language.currentDirection() === 'rtl'
      ? schoolClass.classNameAr
      : schoolClass.classNameEn;
  });

  // True while the request is being sent (prevents a double submit).
  readonly isSubmitting = signal(false);

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);

  readonly invalidCountKey = computed(() => {
    const count = this.invalidCount();

    if (count === 1) return 'CLASSES.FORM.ERRORS_COUNT.ONE';
    if (count === 2) return 'CLASSES.FORM.ERRORS_COUNT.TWO';

    return 'CLASSES.FORM.ERRORS_COUNT.FEW';
  });

  // The discard question is open (so a second Esc does not open another).
  private isConfirmingClose = false;


  readonly classForm = this.fb.nonNullable.group({

    classNameAr: [
      this.data.schoolClass?.classNameAr ?? '',
      [
        requiredTextValidator,
        Validators.maxLength(CLASS_NAME_MAX_LENGTH),
        Validators.pattern(ARABIC_CLASS_NAME)
      ]
    ],

    classNameEn: [
      this.data.schoolClass?.classNameEn ?? '',
      [
        requiredTextValidator,
        Validators.maxLength(CLASS_NAME_MAX_LENGTH),
        Validators.pattern(ENGLISH_CLASS_NAME)
      ]
    ],

    // Level: a whole number above 0 (the backend also checks it is unique).
    // Kept as text so Arabic digits can be converted while typing.
    level: [
      this.data.schoolClass ? String(this.data.schoolClass.level) : '',
      [
        requiredTextValidator,
        Validators.pattern(/^\d+$/),
        Validators.min(1)
      ]
    ],

    isGraduationGrade: [
      this.data.schoolClass?.isGraduationGrade ?? false
    ]

  });

  // The text fields (everything except the switch).
  private readonly textControls = [
    this.classForm.controls.classNameAr,
    this.classForm.controls.classNameEn,
    this.classForm.controls.level
  ];


  constructor() {
    this.setUpClosing();

    // Keep the error count up to date while the user fixes the fields.
    this.classForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    this.restartClearedFields();
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

    if (!this.classForm.dirty) {
      return of(true);
    }

    this.isConfirmingClose = true;

    return this.dialog
      .open<PlanConfirmDialog, PlanConfirmData, boolean>(PlanConfirmDialog, {
        maxWidth: '95vw',
        data: {
          icon: 'edit_note',
          titleKey: 'CLASSES.FORM.DISCARD.TITLE',
          messageKey: 'CLASSES.FORM.DISCARD.MESSAGE',
          confirmKey: 'CLASSES.FORM.DISCARD.CONFIRM',
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
  // Level
  // =========================

  // Arabic digits become English ones while typing or pasting (١٠ → 10),
  // so the user never sees an error for typing them.
  onLevelInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const converted = toEnglishDigits(input.value);

    if (converted === input.value) {
      return;
    }

    // Same length, so the cursor stays where the user is typing.
    const cursor = input.selectionStart;

    input.value = converted;
    input.setSelectionRange(cursor, cursor);

    this.classForm.controls.level.setValue(converted);
  }


  // =========================
  // Save
  // =========================

  // POST /api/schoolclasses (add) or PUT /api/schoolclasses/{id} (edit).
  submit(): void {
    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      this.focusFirstInvalid();
      return;
    }

    const formValue = this.classForm.getRawValue();

    // Same body for create and update.
    // Names are sent without spaces at the start and end.
    const request: CreateSchoolClassRequest & UpdateSchoolClassRequest = {
      classNameAr: formValue.classNameAr.trim(),
      classNameEn: formValue.classNameEn.trim(),
      level: Number(formValue.level),
      isGraduationGrade: formValue.isGraduationGrade
    };

    const schoolClass = this.data.schoolClass;

    const request$ = schoolClass
      ? this.classesService.updateSchoolClass(
          schoolClass.schoolClassId,
          request
        )
      : this.classesService.createSchoolClass(request);

    this.isSubmitting.set(true);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          // Business error (e.g. duplicate name or level):
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
          console.error('Failed to save class:', error);

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
    return this.textControls
      .filter(control => control.invalid)
      .length;
  }


  // The first wrong field in the order it is shown, so the user starts there.
  private focusFirstInvalid(): void {
    const field = this.host.nativeElement.querySelector<HTMLElement>(
      'input.ng-invalid'
    );

    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }


  // When a field shows its error (the same as the student form):
  //   - a wrong kind of character (English letters in the Arabic name,
  //     Arabic letters in the English one, a letter in the level)
  //     shows at once, while typing
  //   - a level of 0 shows when the user leaves the field
  //   - an empty field says "required" only after pressing Add / Save,
  //     so just moving through the fields never shows an error
  //   - after pressing the button every error shows, and each one goes
  //     away as soon as its field is fixed
  isFieldInvalid(fieldName: FieldName): boolean {
    const control = this.classForm.controls[fieldName];

    if (!control.invalid) {
      return false;
    }

    if (this.submitAttempted()) {
      return true;
    }

    if (control.hasError('pattern')) {
      return true;
    }

    return control.touched && control.value.trim() !== '';
  }


  // Clearing a field starts it over: it goes back to "not touched", so
  // typing again shows an error only when the user leaves the field,
  // like the first time. After pressing Add / Save this does not matter:
  // submitAttempted shows every error until it is fixed.
  private restartClearedFields(): void {
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


  // The id of a field's error line (or its help line), for aria-describedby.
  describedBy(fieldName: FieldName, hasHelp = false): string | null {
    if (this.isFieldInvalid(fieldName)) {
      return `cf-${fieldName}-error`;
    }

    return hasHelp ? `cf-${fieldName}-help` : null;
  }

}
