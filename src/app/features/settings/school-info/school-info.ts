import { AbstractControl, ValidationErrors } from '@angular/forms';

import {
  SaveSchoolInfoRequest,
  SchoolInfo,
} from '../../../core/models/school-settings';

// Shared rules and helpers of the school information page (UI only).
// API Reference, section 12: GET / PUT /api/schoolsettings/school.


// =====================================================
// Limits (the backend's, so the user never reaches its 400)
// =====================================================

export const SCHOOL_NAME_MAX_LENGTH = 100;
export const SCHOOL_PHONE_MAX_LENGTH = 20;
export const SCHOOL_ADDRESS_MAX_LENGTH = 200;

// The 7 days, numbered like JavaScript Date.getDay(): 0 Sunday … 6 Saturday.
export const WEEK_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];


// =====================================================
// Validation (22 Nov 2026)
// =====================================================
//
// The names follow the students form: Arabic letters only in the Arabic
// name, English letters only in the English one. Unlike a person's name,
// a school name may have digits ("مدرسة عمّان الثانوية الأولى 2"), so digits
// are accepted in both.

// Arabic name: the letters ء to ي and the harakat (like ARABIC_NAME in
// form-validators.ts), digits 0–9 and ٠–٩, spaces, dots, brackets,
// the Arabic comma and hyphens.
export const SCHOOL_NAME_AR = /^[ء-ْ٠-٩0-9\s.()،-]+$/;

// English name: English letters, digits, spaces and . , ' & ( ) -
export const SCHOOL_NAME_EN = /^[A-Za-z0-9\s.,'&()-]+$/;

// Phone: an optional + at the start, then digits, spaces and hyphens
// ("+962 6 555 1234"). Arabic digits never get here: they are turned
// into English ones while typing (toEnglishDigits).
export const SCHOOL_PHONE = /^\+?[0-9 -]*$/;

// A phone number has at least this many digits (the spaces, hyphens
// and + are not counted).
export const SCHOOL_PHONE_MIN_DIGITS = 7;


// Too few digits in the phone number. An empty phone is fine (optional).
export function phoneDigitsValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();

  if (value === '') {
    return null;
  }

  const digits = value.replace(/\D/g, '').length;

  return digits >= SCHOOL_PHONE_MIN_DIGITS
    ? null
    : { phoneDigits: { required: SCHOOL_PHONE_MIN_DIGITS, actual: digits } };
}


// Every day of the week ticked: the backend refuses it
// ("Every day of the week cannot be a day off.").
export function notEveryDayOffValidator(control: AbstractControl<number[]>): ValidationErrors | null {
  return control.value.length >= WEEK_DAYS.length
    ? { everyDayOff: true }
    : null;
}


// =====================================================
// Form value ⇄ API
// =====================================================

// What the form holds: the phone and the address are '' when empty
// (the API has null for them).
export interface SchoolInfoFormValue {
  schoolNameAr: string;
  schoolNameEn: string;
  phoneNumber: string;
  address: string;
  weeklyDaysOff: number[];
}


export function toFormValue(info: SchoolInfo): SchoolInfoFormValue {
  return {
    schoolNameAr: info.schoolNameAr,
    schoolNameEn: info.schoolNameEn,
    phoneNumber: info.phoneNumber ?? '',
    address: info.address ?? '',
    weeklyDaysOff: [...info.weeklyDaysOff],
  };
}


// Text without spaces at the start and end, and one space between words
// (the backend saves it the same way).
function clean(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}


// The PUT body: every field, every time.
// An empty phone or address is sent as null ("" is not a phone number).
export function toSaveRequest(value: SchoolInfoFormValue): SaveSchoolInfoRequest {
  const phone = clean(value.phoneNumber);
  const address = clean(value.address);

  return {
    schoolNameAr: clean(value.schoolNameAr),
    schoolNameEn: clean(value.schoolNameEn),
    phoneNumber: phone === '' ? null : phone,
    address: address === '' ? null : address,

    // In order, each day once (the backend does the same).
    weeklyDaysOff: [...new Set(value.weeklyDaysOff)].sort((a, b) => a - b),
  };
}


// True when the form says the same as what is saved. Extra spaces do not
// count as a change, so typing a space alone does not show the save bar.
export function isSameAsSaved(value: SchoolInfoFormValue, saved: SchoolInfo): boolean {
  const request = toSaveRequest(value);

  return request.schoolNameAr === clean(saved.schoolNameAr)
    && request.schoolNameEn === clean(saved.schoolNameEn)
    && request.phoneNumber === (saved.phoneNumber ? clean(saved.phoneNumber) : null)
    && request.address === (saved.address ? clean(saved.address) : null)
    && request.weeklyDaysOff.join(',') === [...saved.weeklyDaysOff].sort((a, b) => a - b).join(',');
}
