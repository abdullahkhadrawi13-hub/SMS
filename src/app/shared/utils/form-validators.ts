// Shared validation rules of the person forms: the student form and the
// teacher form now, the parent form when it is redesigned.
// (Moved here from students-form.ts on 11 Nov 2026, with no change in
// the rules themselves.)
//
//   firstNameAr: ['', [nameValidator, Validators.pattern(ARABIC_NAME)]],
//   firstNameEn: ['', [nameValidator, Validators.pattern(ENGLISH_NAME)]],
//   phoneNumber: ['', [
//     Validators.required,
//     digitsOnlyValidator,
//     Validators.minLength(PHONE_LENGTH),
//     Validators.maxLength(PHONE_LENGTH)
//   ]],
//
// The maximum lengths stay in shared/constants/field-lengths.ts, and the
// Arabic digits of the phone number are converted while typing by
// toEnglishDigits() in shared/utils/english-digits.ts.

import { AbstractControl, ValidationErrors } from '@angular/forms';


// Arabic name parts: the Arabic letters ء to ي (U+0621–U+064A), the
// harakat so "محمّد" is accepted (U+064B–U+0652), spaces, dots and hyphens.
// Not accepted: Arabic digits ٠–٩ and marks like ، ؛ ؟ (9 Nov 2026).
export const ARABIC_NAME = /^[ء-ْ\s.-]+$/;

// English name parts: English letters, spaces, dots and hyphens.
export const ENGLISH_NAME = /^[A-Za-z\s.-]+$/;

// The shortest name part, counted without the spaces at the start and end.
export const NAME_MIN_LENGTH = 2;

// The shortest login ID and the shortest temporary password
// (their longest are in field-lengths.ts and temp-password.ts).
export const LOGIN_ID_MIN_LENGTH = 3;
export const PASSWORD_MIN_LENGTH = 8;

// The phone number: exactly 10 digits (the input stops at 10).
export const PHONE_LENGTH = 10;


// A name part (9 Nov 2026):
//   - only spaces counts as empty, so it says "required"
//   - "at least 2 letters" is counted after trimming, so "أ " is too short
// The letters themselves are checked by the pattern next to it.
export function nameValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();

  if (value === '') {
    return { required: true };
  }

  if (value.length < NAME_MIN_LENGTH) {
    return { minlength: { requiredLength: NAME_MIN_LENGTH, actualLength: value.length } };
  }

  return null;
}


// The phone number has something that is not a digit (a letter, a space…).
// Arabic digits never get here: they are turned into English ones while typing.
export function digitsOnlyValidator(control: AbstractControl<string>): ValidationErrors | null {
  return /^[0-9]*$/.test(control.value) ? null : { digitsOnly: true };
}
