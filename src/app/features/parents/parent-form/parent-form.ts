import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { filter, map, Observable, of, Subscription, tap } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

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
import {
  getFirstName,
  getFullName,
  getInitials
} from '../../../shared/utils/person-name';

import { ParentsService } from '../../../core/services/parents';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { ActionResult } from '../../../shared/services/action-result';
import {
  CreateParentRequest,
  getRelationshipTranslationKey,
  ParentDto,
  ParentRelationship,
  UpdateParentRequest
} from '../../../core/models/parent';
import { Student } from '../../../core/models/student';

import { StateCard } from '../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import {
  PlanConfirmData,
  PlanConfirmDialog
} from '../../subjects/subject-plans/plan-confirm-dialog/plan-confirm-dialog';

import { StudentPicker } from '../student-picker/student-picker';
import { RelationshipToggle } from '../relationship-toggle/relationship-toggle';
import {
  findTakenRelationships,
  getAvatarTone,
  getClassSection,
  getListSeparator,
  isRelationshipTaken,
  NO_TAKEN_RELATIONSHIPS,
  TakenRelationships
} from '../parents';


// Data passed when the dialog is opened.
// Without parentId the form adds a parent; with it the form edits that parent.
export interface ParentFormDialogData {
  parentId?: number;
}


// What the dialog closes with (✕ and Cancel close it with nothing).
//
// success:      a parent was added or edited. message is the backend
//               message, shown by parents-page in action-result-dialog.
// linkToParent: the phone number belongs to this parent and the admin
//               chose to link a student to them instead of adding a new one.
export interface ParentFormResult {
  success?: true;
  action?: 'created' | 'updated';
  message?: string;

  linkToParent?: ParentDto;
}


// The phone check of the add form
// (API Reference, section 15: search by phone number first,
// so a father of two children does not get a second account).
//
// idle:     nothing checked yet (or the number changed).
// checking: GET /api/parents?search={phone} is running.
// none:     no parent has this number.
// match:    a parent has this number (matchedParent).
// ignored:  a parent has this number, and the admin chose to add anyway.
// error:    the check failed; adding is still possible.
export type PhoneCheckState =
  'idle' | 'checking' | 'none' | 'match' | 'ignored' | 'error';


// One child added in the form, before saving.
interface ChildRow {
  student: Student;

  // null = not chosen yet (required before saving).
  relationship: ParentRelationship | null;

  // The father / mother the student already has (they cannot be chosen).
  taken: TakenRelationships;

  // True while the student's parents are being loaded.
  isChecking: boolean;
}


// A child row as the form shows it: the names in the language of the page.
interface ChildRowView extends ChildRow {
  fullName: string;
  initials: string;
  avatarTone: number;
  classSection: string;
}


// The name of one of the form's controls.
type FieldName = keyof ParentForm['parentForm']['controls'];


// The four parts of a name, in order. Used by the template to draw
// the Arabic row and the English row with the same labels.
type NamePart = 'firstName' | 'fatherName' | 'grandFatherName' | 'familyName';

const NAME_PARTS: { part: NamePart; labelKey: string }[] = [
  { part: 'firstName',       labelKey: 'PARENTS.FORM.NAME.FIRST' },
  { part: 'fatherName',      labelKey: 'PARENTS.FORM.NAME.FATHER' },
  { part: 'grandFatherName', labelKey: 'PARENTS.FORM.NAME.GRAND_FATHER' },
  { part: 'familyName',      labelKey: 'PARENTS.FORM.NAME.FAMILY' },
];


// Add / edit parent dialog (navy & gold, 11 Nov 2026).
// It works like the student and teacher forms:
//
//   - fixed header (title, one line, ✕), the body scrolls, fixed footer
//   - the layout and the fields use the shared look in styles.css
//     (.fd, .fd-head, .fd-body… and .field, .field-box…)
//   - the rules of the names and the phone come from
//     shared/utils/form-validators.ts (the same as the other two forms)
//   - closing with unsaved changes asks "Discard changes?" first
//     (backdrop click, Esc, ✕ and Cancel, and the browser's Back:
//     parents-page calls confirmDiscard() when ?form / ?edit leaves the URL)
//   - a refresh or closing the tab with unsaved changes: the browser asks
//     first (its own "Leave site?" message, see onBeforeUnload)
//   - saving with errors: every field is marked, the first wrong field
//     gets the focus, and the footer says how many need fixing
//   - after saving: closes with the backend message, which parents-page
//     shows in action-result-dialog
//
// What only this form has (add mode), unchanged in its logic:
//   - the phone number comes first and is checked when the admin leaves
//     the field: a parent who already has it is shown, with "Link a
//     student to this account" and "Create a new account anyway"
//   - "Children": students can be linked while adding (optional)
//
// The dialog is opened by parents-page with panelClass 'form-dialog'
// (full screen on the phone, see styles.css).
@Component({
  selector: 'app-parent-form',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    StudentPicker,
    RelationshipToggle,
    StateCard,
    StatusBadge,
  ],
  templateUrl: './parent-form.html',
  styleUrl: './parent-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd',
    '(window:beforeunload)': 'onBeforeUnload($event)'
  }
})
export class ParentForm {

  // Max lengths for the inputs (same limits as the backend).
  readonly nameMaxLength = USER_NAME_MAX_LENGTH;
  readonly loginIdMaxLength = LOGIN_ID_MAX_LENGTH;
  readonly passwordMaxLength = TEMP_PASSWORD_MAX_LENGTH;

  readonly nameParts = NAME_PARTS;

  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef =
    inject(MatDialogRef<ParentForm, ParentFormResult>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);
  private readonly translate = inject(TranslateService);

  private readonly parentsService = inject(ParentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);

  // Optional data passed by the page (parentId in edit mode).
  private readonly dialogData =
    inject<ParentFormDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  // The direction is set once on <html> by the Language service;
  // here we only need to know which name to show (Arabic or English).
  readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Id of the parent being edited, or null when adding a new parent.
  readonly parentId = signal<number | null>(
    this.dialogData?.parentId ?? null
  );

  // True when the form edits an existing parent.
  readonly isEditMode = signal(!!this.dialogData?.parentId);

  // True while the parent is being loaded in edit mode.
  readonly isLoading = signal(false);

  // True while the form is being saved.
  readonly isSubmitting = signal(false);

  // Loading the parent failed (edit): shown in a state card with Retry.
  readonly loadError = signal('');

  // A problem found before sending (invalid id): shown above the footer.
  readonly errorMessage = signal('');

  // The parent as it came from GET (edit mode).
  readonly parent = signal<ParentDto | null>(null);

  // Edit header line: the parent's name in the UI language · phone number.
  readonly parentName = computed(() => {
    const p = this.parent();

    return p ? getFullName(p, this.isArabic()) : '';
  });

  // The discard question is open (so a second Esc does not open another).
  private isConfirmingClose = false;


  // Same fields and rules as the student and teacher forms.
  readonly parentForm = this.fb.nonNullable.group({

    // Add mode: the first field, checked when the admin leaves it.
    phoneNumber: ['', [
      Validators.required,
      digitsOnlyValidator,
      Validators.minLength(PHONE_LENGTH),
      Validators.maxLength(PHONE_LENGTH)
    ]],

    firstNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],
    fatherNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],
    grandFatherNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],
    familyNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],

    firstNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],
    fatherNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],
    grandFatherNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],
    familyNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],

    loginId: ['', [Validators.required, Validators.minLength(LOGIN_ID_MIN_LENGTH)]],

    // Only used when adding a parent.
    temporaryPassword: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
  });


  // ===== Phone check (add mode) =====

  readonly phoneCheck = signal<PhoneCheckState>('idle');

  // The parent who already has the typed number (state "match").
  readonly matchedParent = signal<ParentDto | null>(null);

  // The matched parent as the notice shows it (names in the page language):
  // "khaled.k · سارة (أب)، عمر (أب)".
  readonly matchView = computed(() => {

    const parent = this.matchedParent();

    if (!parent) {
      return null;
    }

    const isArabic = this.isArabic();

    return {
      parent,
      name: getFullName(parent, isArabic),
      initials: getInitials(parent, isArabic),
      avatarTone: getAvatarTone(parent.parentId),
      children: parent.children
        .map(child =>
          `${getFirstName(child, isArabic)} (${this.translate.instant(
            getRelationshipTranslationKey(child.relationship)
          )})`
        )
        .join(getListSeparator(isArabic))
    };
  });

  // The number of the last finished check (no second request for it).
  private checkedPhone = '';

  private phoneCheckRequest: Subscription | null = null;

  // True when "Save" was pressed before the phone check answered:
  // the save continues by itself once the check finishes
  // (the button shows its spinner meanwhile).
  readonly isWaitingForPhoneCheck = signal(false);

  // The save button is busy: saving, or waiting for the phone check.
  readonly isBusy = computed(() =>
    this.isSubmitting() || this.isWaitingForPhoneCheck()
  );


  // ===== Children (add mode) =====

  readonly children = signal<ChildRow[]>([]);

  // The students already added (disabled in the search results).
  readonly addedStudentIds = computed(
    () => this.children().map(row => row.student.studentId)
  );

  // The child rows with their names in the language of the page.
  readonly childRows = computed<ChildRowView[]>(() => {

    const isArabic = this.isArabic();

    return this.children().map(row => ({
      ...row,
      fullName: getFullName(row.student, isArabic),
      initials: getInitials(row.student, isArabic),
      avatarTone: getAvatarTone(row.student.studentId),
      classSection: getClassSection(row.student, isArabic)
    }));
  });


  // ===== "N fields need fixing" =====

  // True after a save with errors: every error shows until it is fixed.
  readonly submitAttempted = signal(false);

  // The form fields that are still wrong.
  private readonly invalidFields = signal(0);

  // The child rows with no relationship chosen yet.
  private readonly childrenWithoutRelationship = computed(
    () => this.children().filter(row => row.relationship === null).length
  );

  readonly invalidCount = computed(
    () => this.invalidFields() + this.childrenWithoutRelationship()
  );

  readonly invalidCountKey = computed(() => {
    const count = this.invalidCount();

    if (count === 1) return 'PARENTS.FORM.ERRORS_COUNT.ONE';
    if (count === 2) return 'PARENTS.FORM.ERRORS_COUNT.TWO';
    if (count <= 10) return 'PARENTS.FORM.ERRORS_COUNT.FEW';

    return 'PARENTS.FORM.ERRORS_COUNT.MANY';
  });


  constructor() {
    this.setUpClosing();

    // Keep the error count up to date while the user fixes the fields.
    this.parentForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidFields.set(this.countInvalid()));

    this.restartClearedFields();

    if (this.isEditMode()) {
      // The password is not edited here, so it is not required in edit mode.
      this.parentForm.controls.temporaryPassword.clearValidators();
      this.parentForm.controls.temporaryPassword.updateValueAndValidity();

      this.loadParent();
      return;
    }

    // A new number hides the result of the previous check.
    this.parentForm.controls.phoneNumber.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {

        if (value.trim() !== this.checkedPhone) {
          this.phoneCheckRequest?.unsubscribe();
          this.phoneCheck.set('idle');
          this.matchedParent.set(null);

          // Forget the old result, so typing the same number again
          // runs a new check instead of staying "idle".
          this.checkedPhone = '';

          // The admin is editing the number again: cancel a waiting save.
          this.isWaitingForPhoneCheck.set(false);
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


  // Something was typed, or a child was added.
  private hasChanges(): boolean {
    return this.parentForm.dirty || this.children().length > 0;
  }


  // May the form close now?
  //   - true straight away when nothing was changed
  //   - otherwise asks "Discard changes?": true on "Discard changes"
  //   - false while saving, or while the question is already open
  // It does not close the dialog itself: requestClose() does, and
  // parents-page does after "Back" took ?form / ?edit out of the URL.
  confirmDiscard(): Observable<boolean> {
    if (this.isSubmitting() || this.isConfirmingClose) {
      return of(false);
    }

    if (!this.hasChanges()) {
      return of(true);
    }

    this.isConfirmingClose = true;

    return this.dialog
      .open<PlanConfirmDialog, PlanConfirmData, boolean>(PlanConfirmDialog, {
        maxWidth: '95vw',
        data: {
          icon: 'edit_note',
          titleKey: 'PARENTS.FORM.DISCARD.TITLE',
          messageKey: 'PARENTS.FORM.DISCARD.MESSAGE',
          confirmKey: 'PARENTS.FORM.DISCARD.CONFIRM',
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
    if (this.hasChanges()) {
      event.preventDefault();

      // Older browsers ask only when returnValue is set.
      event.returnValue = '';
    }
  }


  // =========================
  // Edit: load the parent
  // =========================

  loadParent(): void {
    const id = this.parentId();

    if (!id) {
      return;
    }

    this.isLoading.set(true);
    this.loadError.set('');

    this.parentsService
      .getParent(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.loadError.set(
              this.apiMessageService.getMessage(response) ||
              'PARENTS.FORM.ERROR.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          const parent = response.data;

          this.parent.set(parent);

          this.parentForm.patchValue({
            firstNameAr: parent.firstNameAr,
            fatherNameAr: parent.fatherNameAr,
            grandFatherNameAr: parent.grandFatherNameAr,
            familyNameAr: parent.familyNameAr,

            firstNameEn: parent.firstNameEn,
            fatherNameEn: parent.fatherNameEn,
            grandFatherNameEn: parent.grandFatherNameEn,
            familyNameEn: parent.familyNameEn,

            loginId: parent.loginId,
            phoneNumber: parent.phoneNumber
          });

          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load parent:', error);

          this.loadError.set('PARENTS.FORM.ERROR.LOAD_FAILED');
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
    const control = this.parentForm.controls.temporaryPassword;

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

    this.parentForm.controls.phoneNumber.setValue(converted);
  }


  // Runs when the admin leaves the phone field (add mode only).
  // Searches parents by the number and keeps only an exact match
  // (the search also matches part of a number or a name).
  checkPhone(): void {

    if (this.isEditMode()) {
      return;
    }

    const control = this.parentForm.controls.phoneNumber;
    const phone = control.value.trim();

    if (control.invalid || phone === this.checkedPhone) {
      return;
    }

    this.phoneCheckRequest?.unsubscribe();

    this.phoneCheck.set('checking');
    this.matchedParent.set(null);

    this.phoneCheckRequest = this.parentsService
      .getParents({ search: phone, pageSize: 10 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.checkedPhone = phone;

          if (!response.success) {
            this.phoneCheck.set('error');
            this.continuePendingSubmit();
            return;
          }

          const match = response.data.items.find(
            parent => parent.phoneNumber === phone
          );

          this.matchedParent.set(match ?? null);
          this.phoneCheck.set(match ? 'match' : 'none');
          this.continuePendingSubmit();
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to check the phone number:', error);

          this.checkedPhone = phone;
          this.phoneCheck.set('error');
          this.continuePendingSubmit();
        },
      });
  }


  // "Save" was pressed while the check was running: save now.
  // onSubmit checks everything again, so a matched number still
  // stops the save and asks the admin to decide first.
  private continuePendingSubmit(): void {

    if (!this.isWaitingForPhoneCheck()) {
      return;
    }

    this.isWaitingForPhoneCheck.set(false);
    this.onSubmit();
  }


  // "Link a student to this account": closes the form; the page opens
  // the "Link a child" dialog for the parent who has this number.
  // (The admin chose it, so there is no "Discard changes?" question.)
  linkToMatchedParent(): void {

    const parent = this.matchedParent();

    if (parent) {
      this.dialogRef.close({ linkToParent: parent });
    }
  }


  // "Create a new account anyway" (for example a mother who uses the
  // father's number): hides the notice and allows saving.
  ignoreMatch(): void {
    this.phoneCheck.set('ignored');
  }


  // =========================
  // Children (add only)
  // =========================

  // Adds the chosen student, then loads their parents to know
  // whether a father / mother is already linked.
  addChild(student: Student): void {

    if (this.addedStudentIds().includes(student.studentId)) {
      return;
    }

    this.children.update(rows => [
      ...rows,
      {
        student,
        relationship: null,
        taken: NO_TAKEN_RELATIONSHIPS,
        isChecking: true,
      },
    ]);

    this.parentsService
      .getParents({ studentId: student.studentId, pageSize: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          const taken = response.success
            ? findTakenRelationships(
                response.data.items,
                student.studentId,
                this.isArabic()
              )
            : NO_TAKEN_RELATIONSHIPS;

          this.updateChild(student.studentId, row => ({
            ...row,
            taken,
            isChecking: false,
          }));
        },

        // Not blocking: the backend still refuses a second father / mother.
        error: (error: HttpErrorResponse) => {

          console.error('Failed to load the student\'s parents:', error);

          this.updateChild(student.studentId, row => ({
            ...row,
            isChecking: false,
          }));
        },
      });
  }


  setRelationship(studentId: number, relationship: ParentRelationship): void {

    this.updateChild(studentId, row =>
      isRelationshipTaken(row.taken, relationship)
        ? row
        : { ...row, relationship }
    );
  }


  removeChild(studentId: number): void {
    this.children.update(rows =>
      rows.filter(row => row.student.studentId !== studentId)
    );
  }


  private updateChild(
    studentId: number,
    change: (row: ChildRow) => ChildRow
  ): void {

    this.children.update(rows =>
      rows.map(row =>
        row.student.studentId === studentId ? change(row) : row
      )
    );
  }


  // =========================
  // Save
  // =========================

  onSubmit(): void {
    // The button keeps its colour while saving, so guard here instead.
    if (this.isBusy()) {
      return;
    }

    this.errorMessage.set('');

    // A child still being checked has no relationship yet, so it counts too.
    if (this.parentForm.invalid || this.childrenWithoutRelationship() > 0) {
      this.parentForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidFields.set(this.countInvalid());

      this.focusFirstInvalid();
      return;
    }

    if (this.isEditMode()) {
      this.isSubmitting.set(true);
      this.updateParent();
      return;
    }

    // The phone check has not answered yet (for example Enter was pressed
    // inside the phone field, so it never lost focus): wait for it,
    // then the save continues by itself (continuePendingSubmit).
    if (this.phoneCheck() === 'checking') {
      this.isWaitingForPhoneCheck.set(true);
      return;
    }

    if (this.phoneCheck() === 'idle') {
      this.isWaitingForPhoneCheck.set(true);
      this.checkPhone();
      return;
    }

    // The number belongs to another parent: the admin decides first.
    if (this.phoneCheck() === 'match') {

      this.host.nativeElement
        .querySelector<HTMLElement>('#pf-phone-title')
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' });

      this.actionResult.show(
        'warning',
        this.translate.instant('PARENTS.FORM.PHONE.DECIDE_FIRST')
      );
      return;
    }

    this.isSubmitting.set(true);
    this.createParent();
  }


  // The body shared by POST and PUT.
  // Names are sent without spaces at the start and end.
  private buildRequest(): UpdateParentRequest {
    const formValue = this.parentForm.getRawValue();

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


  // POST /api/parents (the account and the children in one request).
  private createParent(): void {

    const data: CreateParentRequest = {
      ...this.buildRequest(),
      temporaryPassword: this.parentForm.getRawValue().temporaryPassword,
      children: this.children().map(row => ({
        studentId: row.student.studentId,
        relationship: row.relationship as ParentRelationship,
      })),
    };

    this.parentsService
      .createParent(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          // parents-page shows the backend message once ?form / ?edit
          // is out of the URL: going "Back" over that step would close
          // a message opened now.
          this.dialogRef.close({
            success: true,
            action: 'created',
            message: this.apiMessageService.getMessage(response)
          });
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to create parent:', error);

          this.isSubmitting.set(false);

          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        }
      });
  }


  // PUT /api/parents/{parentId} (names, login ID and phone number).
  // Children are linked and unlinked from the parent details.
  private updateParent(): void {
    const id = this.parentId();

    if (!id) {
      this.errorMessage.set('PARENTS.FORM.ERROR.INVALID_ID');
      this.isSubmitting.set(false);
      return;
    }

    this.parentsService
      .updateParent(id, this.buildRequest())
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
          });
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to update parent:', error);

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
    return Object.values(this.parentForm.controls)
      .filter(control => control.invalid)
      .length;
  }


  // The first wrong field in the order it is shown, so the user starts
  // there; when every field is right, the first child row with no
  // relationship chosen.
  private focusFirstInvalid(): void {
    const element = this.host.nativeElement;

    const field =
      element.querySelector<HTMLElement>('input.ng-invalid') ??
      element.querySelector<HTMLElement>('.pf-child.is-invalid input:not(:disabled)') ??
      element.querySelector<HTMLElement>('.pf-child.is-invalid');

    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }


  // When a field shows its error (the same as the student and teacher forms):
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
    const control = this.parentForm.controls[fieldName];

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
    for (const control of Object.values(this.parentForm.controls)) {
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
      return `pf-${fieldName}-error`;
    }

    return hasHelp ? `pf-${fieldName}-help` : null;
  }


  // Name rows: the form control of a name part in one language.
  nameControl(part: NamePart, lang: 'Ar' | 'En'): FieldName {
    return `${part}${lang}` as FieldName;
  }
}
