import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { filter, map, Observable, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import {
  LOGIN_ID_MAX_LENGTH,
  USER_NAME_MAX_LENGTH
} from '../../../shared/constants/field-lengths';
import {
  generateTempPassword,
  TEMP_PASSWORD_MAX_LENGTH
} from '../../../shared/utils/temp-password';
import { toEnglishDigits } from '../../../shared/utils/english-digits';
import {
  ARABIC_NAME,
  ENGLISH_NAME,
  LOGIN_ID_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  PHONE_LENGTH,
  digitsOnlyValidator,
  nameValidator
} from '../../../shared/utils/form-validators';
import { getFullName } from '../../../shared/utils/person-name';

import { TeachersService } from '../../../core/services/teachers';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { ActionResult } from '../../../shared/services/action-result';

import {
  CreateTeacherRequest,
  TeacherListDto,
  UpdateTeacherRequest
} from '../../../core/models/teacher';

import { StateCard } from '../../../shared/components/state-card/state-card';
import {
  PlanConfirmData,
  PlanConfirmDialog
} from '../../subjects/subject-plans/plan-confirm-dialog/plan-confirm-dialog';


// Data passed when the form is opened in edit mode.
export interface TeacherFormDialogData {
  teacherId?: number;
}


// What the dialog closes with after a successful save
// (✕ and Cancel close it with nothing).
export interface TeacherFormResult {
  success: true;
  action: 'created' | 'updated';
  // The backend message, shown by teachers-page in action-result-dialog.
  message: string;
}


// The name of one of the form's controls.
type FieldName = keyof TeacherForm['teacherForm']['controls'];


// The four parts of a name, in order. Used by the template to draw
// the Arabic row and the English row with the same labels.
type NamePart = 'firstName' | 'fatherName' | 'grandFatherName' | 'familyName';

const NAME_PARTS: { part: NamePart; labelKey: string }[] = [
  { part: 'firstName',       labelKey: 'TEACHERS.FORM.NAME.FIRST' },
  { part: 'fatherName',      labelKey: 'TEACHERS.FORM.NAME.FATHER' },
  { part: 'grandFatherName', labelKey: 'TEACHERS.FORM.NAME.GRAND_FATHER' },
  { part: 'familyName',      labelKey: 'TEACHERS.FORM.NAME.FAMILY' },
];


// Add / edit teacher dialog (navy & gold, 11 Nov 2026).
// It works like the student form:
//
//   - fixed header (title, one line, ✕), the body scrolls, fixed footer
//   - the layout and the fields use the shared look in styles.css
//     (.fd, .fd-head, .fd-body… and .field, .field-box…)
//   - the rules of the names and the phone come from
//     shared/utils/form-validators.ts (the same as the student form)
//   - closing with unsaved changes asks "Discard changes?" first
//     (backdrop click, Esc, ✕ and Cancel, and the browser's Back:
//     teachers-page calls confirmDiscard() when ?form / ?edit leaves the URL)
//   - a refresh or closing the tab with unsaved changes: the browser asks
//     first (its own "Leave site?" message, see onBeforeUnload)
//   - saving with errors: every field is marked, the first wrong field
//     gets the focus, and the footer says how many need fixing
//   - after saving: closes with the backend message, which teachers-page
//     shows in action-result-dialog
//
// The dialog is opened by teachers-page with panelClass 'form-dialog'
// (full screen on the phone, see styles.css).
@Component({
  selector: 'app-teacher-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    StateCard,
  ],
  templateUrl: './teacher-form.html',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd',
    '(window:beforeunload)': 'onBeforeUnload($event)'
  }
})
export class TeacherForm {

  // Max lengths for the inputs (same limits as the backend).
  readonly nameMaxLength = USER_NAME_MAX_LENGTH;
  readonly loginIdMaxLength = LOGIN_ID_MAX_LENGTH;
  readonly passwordMaxLength = TEMP_PASSWORD_MAX_LENGTH;

  readonly nameParts = NAME_PARTS;

  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<TeacherForm>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);

  private readonly teachersService = inject(TeachersService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);

  // Optional data passed by the page (teacherId in edit mode).
  private readonly dialogData =
    inject<TeacherFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  // The direction is set once on <html> by the Language service;
  // here we only need to know which name to show (Arabic or English).
  readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Id of the teacher being edited, or null when adding a new teacher.
  readonly teacherId = signal<number | null>(
    this.dialogData?.teacherId ?? null
  );

  // True when the form edits an existing teacher.
  readonly isEditMode = signal(!!this.dialogData?.teacherId);

  // True while the teacher is being loaded in edit mode.
  readonly isLoading = signal(false);

  // True while the form is being saved.
  readonly isSubmitting = signal(false);

  // Loading the teacher failed (edit): shown in a state card with Retry.
  readonly loadError = signal('');

  // A problem found before sending (invalid id): shown above the footer.
  readonly errorMessage = signal('');

  // The teacher as it came from GET (edit mode).
  readonly teacher = signal<TeacherListDto | null>(null);

  // Edit header line: the teacher's name in the UI language · number.
  readonly teacherName = computed(() => {
    const t = this.teacher();

    return t ? getFullName(t, this.isArabic()) : '';
  });

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);

  readonly invalidCountKey = computed(() => {
    const count = this.invalidCount();

    if (count === 1) return 'TEACHERS.FORM.ERRORS_COUNT.ONE';
    if (count === 2) return 'TEACHERS.FORM.ERRORS_COUNT.TWO';
    if (count <= 10) return 'TEACHERS.FORM.ERRORS_COUNT.FEW';

    return 'TEACHERS.FORM.ERRORS_COUNT.MANY';
  });

  // The discard question is open (so a second Esc does not open another).
  private isConfirmingClose = false;


  // Teacher form fields and validation rules.
  readonly teacherForm = this.fb.nonNullable.group({
    firstNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],
    fatherNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],
    grandFatherNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],
    familyNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],

    firstNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],
    fatherNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],
    grandFatherNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],
    familyNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],

    loginId: ['', [Validators.required, Validators.minLength(LOGIN_ID_MIN_LENGTH)]],

    temporaryPassword: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],

    phoneNumber: ['', [
      Validators.required,
      digitsOnlyValidator,
      Validators.minLength(PHONE_LENGTH),
      Validators.maxLength(PHONE_LENGTH)
    ]]
  });


  constructor() {
    this.setUpClosing();

    // Keep the error count up to date while the user fixes the fields.
    this.teacherForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    this.restartClearedFields();

    if (this.isEditMode()) {
      // The password is not edited here, so it is not required in edit mode.
      this.teacherForm.controls.temporaryPassword.clearValidators();
      this.teacherForm.controls.temporaryPassword.updateValueAndValidity();

      this.loadTeacher();
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
  // It does not close the dialog itself: requestClose() does, and
  // teachers-page does after "Back" took ?form / ?edit out of the URL.
  confirmDiscard(): Observable<boolean> {
    if (this.isSubmitting() || this.isConfirmingClose) {
      return of(false);
    }

    if (!this.teacherForm.dirty) {
      return of(true);
    }

    this.isConfirmingClose = true;

    return this.dialog
      .open<PlanConfirmDialog, PlanConfirmData, boolean>(PlanConfirmDialog, {
        maxWidth: '95vw',
        data: {
          icon: 'edit_note',
          titleKey: 'TEACHERS.FORM.DISCARD.TITLE',
          messageKey: 'TEACHERS.FORM.DISCARD.MESSAGE',
          confirmKey: 'TEACHERS.FORM.DISCARD.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .pipe(
        tap(() => (this.isConfirmingClose = false)),
        map(confirmed => confirmed === true)
      );
  }


  // Refresh, closing the tab, or typing another address while something
  // was changed: the browser asks "Leave site?" first. The text is the
  // browser's own, in its language; a page cannot change it.
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.teacherForm.dirty) {
      event.preventDefault();

      // Older browsers ask only when returnValue is set.
      event.returnValue = '';
    }
  }


  // =========================
  // Edit: load the teacher
  // =========================

  loadTeacher(): void {
    const id = this.teacherId();

    if (!id) {
      return;
    }

    this.isLoading.set(true);
    this.loadError.set('');

    this.teachersService
      .getTeacher(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.loadError.set(
              this.apiMessageService.getMessage(response) ||
              'TEACHERS.FORM.ERROR.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          const teacher = response.data;

          this.teacher.set(teacher);

          this.teacherForm.patchValue({
            firstNameAr: teacher.firstNameAr,
            fatherNameAr: teacher.fatherNameAr,
            grandFatherNameAr: teacher.grandFatherNameAr,
            familyNameAr: teacher.familyNameAr,

            firstNameEn: teacher.firstNameEn,
            fatherNameEn: teacher.fatherNameEn,
            grandFatherNameEn: teacher.grandFatherNameEn,
            familyNameEn: teacher.familyNameEn,

            loginId: teacher.loginId,
            phoneNumber: teacher.phoneNumber
          });

          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load teacher:', error);

          this.loadError.set('TEACHERS.FORM.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        }
      });
  }


  // =========================
  // Temporary password (add only)
  // =========================

  // Fills the field with a password like Abc-4def-g7 (11 characters,
  // backend: 8 to 100, no other rules). The field stays editable by hand.
  generatePassword(): void {
    const control = this.teacherForm.controls.temporaryPassword;

    control.setValue(generateTempPassword());
    control.markAsDirty();
    control.markAsTouched();
  }


  // =========================
  // Phone number
  // =========================

  // Arabic digits become English ones while typing or pasting
  // (٠٧٩ → 079), so the user never sees an error for typing them,
  // and the backend still gets English digits only.
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const converted = toEnglishDigits(input.value);

    if (converted === input.value) {
      return;
    }

    // Same length, so the cursor stays where the user is typing.
    const cursor = input.selectionStart;

    input.value = converted;
    input.setSelectionRange(cursor, cursor);

    this.teacherForm.controls.phoneNumber.setValue(converted);
  }


  // =========================
  // Save
  // =========================

  onSubmit(): void {
    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');

    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      this.focusFirstInvalid();
      return;
    }

    this.isSubmitting.set(true);

    if (this.isEditMode()) {
      this.updateTeacher();
    } else {
      this.createTeacher();
    }
  }


  // The body shared by POST and PUT.
  // Names are sent without spaces at the start and end.
  private buildRequest(): UpdateTeacherRequest {
    const formValue = this.teacherForm.getRawValue();

    return {
      firstNameAr: formValue.firstNameAr.trim(),
      fatherNameAr: formValue.fatherNameAr.trim(),
      grandFatherNameAr: formValue.grandFatherNameAr.trim(),
      familyNameAr: formValue.familyNameAr.trim(),

      firstNameEn: formValue.firstNameEn.trim(),
      fatherNameEn: formValue.fatherNameEn.trim(),
      grandFatherNameEn: formValue.grandFatherNameEn.trim(),
      familyNameEn: formValue.familyNameEn.trim(),

      loginId: formValue.loginId,
      phoneNumber: formValue.phoneNumber
    };
  }


  // Creates a new teacher (POST /api/teachers).
  private createTeacher(): void {
    const data: CreateTeacherRequest = {
      ...this.buildRequest(),
      temporaryPassword: this.teacherForm.getRawValue().temporaryPassword
    };

    this.teachersService
      .createTeacher(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          // teachers-page shows the backend message once ?form / ?edit
          // is out of the URL: going "Back" over that step would close
          // a message opened now.
          this.dialogRef.close({
            success: true,
            action: 'created',
            message: this.apiMessageService.getMessage(response)
          } satisfies TeacherFormResult);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to create teacher:', error);

          this.isSubmitting.set(false);

          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        }
      });
  }


  // Edits an existing teacher (PUT /api/teachers/{teacherId}).
  // The edit body is the same as creation without the password.
  private updateTeacher(): void {
    const id = this.teacherId();

    if (!id) {
      this.errorMessage.set('TEACHERS.FORM.ERROR.INVALID_ID');
      this.isSubmitting.set(false);
      return;
    }

    this.teachersService
      .updateTeacher(id, this.buildRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          this.dialogRef.close({
            success: true,
            action: 'updated',
            message: this.apiMessageService.getMessage(response)
          } satisfies TeacherFormResult);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to update teacher:', error);

          this.isSubmitting.set(false);

          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        }
      });
  }


  // =========================
  // Errors
  // =========================

  // Fields that are still wrong.
  private countInvalid(): number {
    return Object.values(this.teacherForm.controls)
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
  //   - a wrong kind of character (English letters in an Arabic name,
  //     Arabic letters in an English one, a letter in the phone number)
  //     shows at once, while typing
  //   - a length error (2 letters in a name, 3 in the login ID, 8 in the
  //     password, 10 digits in the phone) shows when the user leaves the field
  //   - an empty field says "required" only after pressing Add / Save,
  //     so just moving through the fields never shows an error
  //   - after pressing the button every error shows, and each one goes
  //     away as soon as its field is fixed
  isFieldInvalid(fieldName: FieldName): boolean {
    const control = this.teacherForm.controls[fieldName];

    if (!control.invalid) {
      return false;
    }

    if (this.submitAttempted()) {
      return true;
    }

    if (control.hasError('pattern') || control.hasError('digitsOnly')) {
      return true;
    }

    return control.touched && control.value.trim() !== '';
  }


  // Clearing a field starts it over: it goes back to "not touched", so
  // typing again ("أ") shows the length error only when the user leaves
  // the field, like the first time.
  // After pressing Add / Save this does not matter: submitAttempted shows
  // every error until it is fixed.
  private restartClearedFields(): void {
    for (const control of Object.values(this.teacherForm.controls)) {
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(value => {
          if (value.trim() === '') {
            control.markAsUntouched();
          }
        });
    }
  }


  // The id of a field's error line, for aria-describedby.
  describedBy(fieldName: string, hasHelp = false): string | null {
    if (this.isFieldInvalid(fieldName as FieldName)) {
      return `tf-${fieldName}-error`;
    }

    return hasHelp ? `tf-${fieldName}-help` : null;
  }


  // Name rows: the form control of a name part in one language.
  nameControl(part: NamePart, lang: 'Ar' | 'En'): FieldName {
    return `${part}${lang}` as FieldName;
  }
}
