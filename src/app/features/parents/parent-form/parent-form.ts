import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Subscription } from 'rxjs';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ParentsService } from '../../../core/services/parents';
import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';
import {
  CreateParentRequest,
  getRelationshipTranslationKey,
  ParentDto,
  ParentRelationship,
  UpdateParentRequest
} from '../../../core/models/parent';
import { Student } from '../../../core/models/student';

import { StudentPicker } from '../student-picker/student-picker';
import { RelationshipToggle } from '../relationship-toggle/relationship-toggle';
import {
  findTakenRelationships,
  getClassSection,
  getFirstName,
  getFullName,
  isArabicPage,
  isRelationshipTaken,
  NO_TAKEN_RELATIONSHIPS,
  TakenRelationships
} from '../parents';


// Data passed when the dialog is opened.
// Without parentId the form adds a parent; with it the form edits that parent.
export interface ParentFormDialogData {
  parentId?: number;
}


// What the dialog returns to the page.
// success: a parent was added or edited (reload the list).
// linkToParent: the phone number belongs to this parent and the admin
//               chose to link a student to them instead of adding a new one.
export interface ParentFormResult {
  success?: boolean;
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


@Component({
  selector: 'app-parent-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    StudentPicker,
    RelationshipToggle,
  ],
  templateUrl: './parent-form.html',
  styleUrl: './parent-form.css',
})
export class ParentForm {

  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject(MatDialogRef<ParentForm, ParentFormResult>);
  private readonly parentsService = inject(ParentsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly translate = inject(TranslateService);

  private readonly dialogData =
    inject<ParentFormDialogData | null>(
      MAT_DIALOG_DATA,
      { optional: true }
    );


  // Id of the parent being edited, or null when adding a new parent.
  readonly parentId = this.dialogData?.parentId ?? null;

  // True when the form edits an existing parent.
  readonly isEditMode = !!this.parentId;

  // True while the parent is being loaded in edit mode.
  readonly isLoading = signal(false);

  // True while the form is being saved.
  readonly isSubmitting = signal(false);

  // Error message (translation key or API message) shown above the form
  // when the parent cannot be loaded (edit mode).
  readonly errorMessage = signal('');


  // Same fields and rules as the teacher form.
  readonly parentForm = this.fb.nonNullable.group({

    // Phone number (add mode: the first field, checked when leaving it).
    phoneNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/),
      ],
    ],

    // Arabic name fields: allow Arabic letters, spaces, dots, and hyphens.
    firstNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[؀-ۿ\s.-]+$/)]],
    fatherNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[؀-ۿ\s.-]+$/)]],
    grandFatherNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[؀-ۿ\s.-]+$/)]],
    familyNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[؀-ۿ\s.-]+$/)]],

    // English name fields: allow English letters, spaces, dots, and hyphens.
    firstNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s.-]+$/)]],
    fatherNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s.-]+$/)]],
    grandFatherNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s.-]+$/)]],
    familyNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s.-]+$/)]],

    // Login ID must be provided and contain at least 3 characters.
    loginId: ['', [Validators.required, Validators.minLength(3)]],

    // Temporary password: only used when adding a parent (8+ characters).
    temporaryPassword: ['', [Validators.required, Validators.minLength(8)]],
  });


  // ===== Phone check (add mode) =====

  readonly phoneCheck = signal<PhoneCheckState>('idle');

  // The parent who already has the typed number (state "match").
  readonly matchedParent = signal<ParentDto | null>(null);

  // The number of the last finished check (no second request for it).
  private checkedPhone = '';

  private phoneCheckRequest: Subscription | null = null;

  // True when "Save" was pressed before the phone check answered:
  // the save continues by itself once the check finishes.
  private submitAfterPhoneCheck = false;


  // ===== Children (add mode) =====

  readonly children = signal<ChildRow[]>([]);

  // True after a save attempt: shows "Choose the relationship" on rows without one.
  readonly childrenTouched = signal(false);

  // The students already added (disabled in the search results).
  readonly addedStudentIds = computed(
    () => this.children().map(row => row.student.studentId)
  );


  readonly getFullName = getFullName;
  readonly getClassSection = getClassSection;
  readonly getRelationshipTranslationKey = getRelationshipTranslationKey;


  constructor() {

    if (this.isEditMode) {

      // The password is not edited here, so it is not required in edit mode.
      this.parentForm.controls.temporaryPassword.clearValidators();
      this.parentForm.controls.temporaryPassword.updateValueAndValidity();

      this.loadParent(this.parentId!);
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
          this.submitAfterPhoneCheck = false;
        }
      });
  }


  // ===== Edit mode =====

  // Loads the parent and fills the form.
  private loadParent(parentId: number): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.parentsService
      .getParent(parentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success || !response.data) {

            this.errorMessage.set(
              this.apiMessageService.getMessage(response) ||
              'PARENTS.FORM.ERROR.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          const parent = response.data;

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
            phoneNumber: parent.phoneNumber,
          });

          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load parent:', error);

          this.errorMessage.set('PARENTS.FORM.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        },
      });
  }


  // ===== Phone check =====

  // Runs when the admin leaves the phone field (add mode).
  // Searches parents by the number and keeps only an exact match
  // (the search also matches part of a number or a name).
  checkPhone(): void {

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

    if (!this.submitAfterPhoneCheck) {
      return;
    }

    this.submitAfterPhoneCheck = false;
    this.onSubmit();
  }


  // "Link a student to this account": closes the form; the page opens
  // the "Link a child" dialog for the parent who has this number.
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


  // The matched parent's children: "سارة (أب)، عمر (أب)".
  matchedChildrenText(parent: ParentDto): string {

    return parent.children
      .map(child =>
        `${getFirstName(child)} (${this.translate.instant(
          getRelationshipTranslationKey(child.relationship)
        )})`
      )
      .join(isArabicPage() ? '، ' : ', ');
  }


  // ===== Children =====

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
            ? findTakenRelationships(response.data.items, student.studentId)
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


  // ===== Save =====

  onSubmit(): void {

    if (this.isSubmitting()) {
      return;
    }

    if (this.isEditMode) {

      if (this.parentForm.invalid) {
        this.parentForm.markAllAsTouched();
        return;
      }

      this.isSubmitting.set(true);
      this.updateParent();
      return;
    }

    this.childrenTouched.set(true);

    const childrenInvalid = this.children().some(
      row => row.relationship === null || row.isChecking
    );

    if (this.parentForm.invalid || childrenInvalid) {
      this.parentForm.markAllAsTouched();
      return;
    }

    // The phone check has not answered yet (for example Enter was pressed
    // inside the phone field, so it never lost focus): wait for it,
    // then the save continues by itself (continuePendingSubmit).
    if (this.phoneCheck() === 'checking') {
      this.submitAfterPhoneCheck = true;
      return;
    }

    if (this.phoneCheck() === 'idle') {
      this.submitAfterPhoneCheck = true;
      this.checkPhone();
      return;
    }

    // The number belongs to another parent: the admin decides first.
    if (this.phoneCheck() === 'match') {

      this.actionResult.show(
        'warning',
        this.translate.instant('PARENTS.FORM.PHONE_DECIDE_FIRST')
      );
      return;
    }

    this.isSubmitting.set(true);
    this.createParent();
  }


  // POST /api/parents (the account and the children in one request).
  private createParent(): void {

    const value = this.parentForm.getRawValue();

    const data: CreateParentRequest = {
      ...value,
      children: this.children().map(row => ({
        studentId: row.student.studentId,
        relationship: row.relationship as ParentRelationship,
      })),
    };

    this.parentsService
      .createParent(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.dialogRef.close({ success: true });

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to create parent:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // PUT /api/parents/{parentId} (names, login ID and phone number).
  private updateParent(): void {

    const value = this.parentForm.getRawValue();

    const data: UpdateParentRequest = {
      firstNameAr: value.firstNameAr,
      fatherNameAr: value.fatherNameAr,
      grandFatherNameAr: value.grandFatherNameAr,
      familyNameAr: value.familyNameAr,

      firstNameEn: value.firstNameEn,
      fatherNameEn: value.fatherNameEn,
      grandFatherNameEn: value.grandFatherNameEn,
      familyNameEn: value.familyNameEn,

      loginId: value.loginId,
      phoneNumber: value.phoneNumber,
    };

    this.parentsService
      .updateParent(this.parentId!, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.dialogRef.close({ success: true });

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to update parent:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // Closes the form without saving.
  cancel(): void {
    this.dialogRef.close();
  }


  // Checks whether a field is invalid and has been touched.
  isFieldInvalid(
    fieldName: keyof typeof this.parentForm.controls
  ): boolean {

    const control = this.parentForm.controls[fieldName];

    return control.invalid && control.touched;
  }
}