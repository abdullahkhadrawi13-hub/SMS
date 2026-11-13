import { DestroyRef, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';

import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { filter, map, Observable, of, tap } from 'rxjs';

import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog';
import { pluralKey } from '../../../shared/utils/plural';


// =========================
// What the form dialogs of the Subjects section share
// (subject, plan, plan component, subject assignment, copy plans),
// so each form does not repeat it. They work like the student, teacher
// and class forms (navy & gold, 13 Nov 2026):
//
//   - closing with unsaved changes asks "Discard changes?" first
//     (backdrop click, Esc, ✕ and Cancel)          → useDiscardOnClose()
//   - when a field shows its error                  → showFieldError()
//   - clearing a field starts it over               → restartWhenCleared()
//   - saving with errors: the first wrong field gets the focus,
//     and the footer says how many need fixing      → focusFirstInvalid(),
//                                                     errorsCountKey()
// =========================


// Call it in a field initializer of the form component (it uses inject()).
//
//   private readonly closing = useDiscardOnClose({
//     isDirty: () => this.form.dirty,
//     isBusy: () => this.isSubmitting(),
//   });
//
//   requestClose() → closes now when nothing changed,
//                    otherwise asks first.
export function useDiscardOnClose(options: {
  isDirty: () => boolean;
  isBusy: () => boolean;
}): { requestClose: () => void } {

  const dialogRef = inject(MatDialogRef);
  const dialog = inject(MatDialog);
  const destroyRef = inject(DestroyRef);

  // The question is open (so a second Esc does not open another).
  let isConfirming = false;

  const confirmDiscard = (): Observable<boolean> => {

    if (options.isBusy() || isConfirming) {
      return of(false);
    }

    if (!options.isDirty()) {
      return of(true);
    }

    isConfirming = true;

    return dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        maxWidth: '95vw',
        data: {
          icon: 'edit_note',
          titleKey: 'SUBJECTS.FORMS.DISCARD.TITLE',
          messageKey: 'SUBJECTS.FORMS.DISCARD.MESSAGE',
          confirmKey: 'SUBJECTS.FORMS.DISCARD.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .pipe(
        tap(() => (isConfirming = false)),
        map(confirmed => confirmed === true)
      );
  };

  const requestClose = (): void => {
    confirmDiscard().subscribe(canClose => {
      if (canClose) {
        dialogRef.close();
      }
    });
  };

  // Backdrop click and Esc do not close the dialog by themselves:
  // they go through requestClose().
  dialogRef.disableClose = true;

  dialogRef
    .backdropClick()
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => requestClose());

  dialogRef
    .keydownEvents()
    .pipe(
      filter(event => event.key === 'Escape'),
      takeUntilDestroyed(destroyRef)
    )
    .subscribe(event => {
      event.preventDefault();
      requestClose();
    });

  return { requestClose };
}


// When a field shows its error (the same rule as the student form):
//   - a wrong kind of character (English letters in an Arabic name,
//     Arabic letters in an English one): at once, while typing
//     → the error keys in `immediate` ('invalidChars', 'pattern')
//   - any other error of a filled field (too short, 0, more than 100):
//     when the user leaves the field
//   - an empty field says "required" only after pressing the save button
//   - after pressing it every error shows until its field is fixed
export function showFieldError(
  control: AbstractControl,
  submitAttempted: boolean,
  immediate: string[] = ['invalidChars', 'pattern']
): boolean {

  if (!control.invalid) {
    return false;
  }

  if (submitAttempted) {
    return true;
  }

  if (immediate.some(key => control.hasError(key))) {
    return true;
  }

  return control.touched && !isEmpty(control.value);
}


// Clearing a field starts it over: it goes back to "not touched", so
// typing again shows an error only when the user leaves the field.
export function restartWhenCleared(
  controls: AbstractControl[],
  destroyRef: DestroyRef
): void {

  for (const control of controls) {
    control.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(value => {
        if (isEmpty(value)) {
          control.markAsUntouched();
        }
      });
  }
}


// The first wrong field in the order it is shown, so the user starts there.
export function focusFirstInvalid(host: ElementRef<HTMLElement>): void {

  const field = host.nativeElement.querySelector<HTMLElement>(
    'input.ng-invalid, select.ng-invalid, [role="radiogroup"].ng-invalid input'
  );

  field?.focus();
  field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}


// "3 fields need fixing", with the right Arabic plural form.
export function errorsCountKey(count: number): string {
  return pluralKey('SUBJECTS.FORMS.ERRORS_COUNT', count);
}


function isEmpty(value: unknown): boolean {
  return value === null
    || value === undefined
    || (typeof value === 'string' && value.trim() === '');
}
