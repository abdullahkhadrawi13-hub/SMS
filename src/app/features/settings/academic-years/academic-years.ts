import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { AcademicYear } from '../../../core/models/academic-year';
import { AcademicTerm } from '../../../core/models/academic-term';

// Shared types and helpers of the academic years page (UI only).


// =====================================================
// Types
// =====================================================

// Badge shown on a year card.
// current : isCurrent = true (from the backend).
// upcoming: starts after the current year ends   (worked out here).
// past    : ends before the current year starts  (worked out here).
// null    : no badge (no current year yet, or the dates overlap it).
export type YearStatus = 'current' | 'upcoming' | 'past' | null;

// One year card: the year, its terms (by termNumber) and its badge.
export interface AcademicYearView {
  year: AcademicYear;
  terms: AcademicTerm[];
  status: YearStatus;
}


// =====================================================
// Year status
// =====================================================

// The API only gives isCurrent. "Upcoming" and "past" compare the year
// with the CURRENT YEAR's dates (not with today's date), so a year can
// never be "current" and "past" at the same time.
// The dates are "YYYY-MM-DDT00:00:00" strings, so they compare as text.
export function getYearStatus(
  year: AcademicYear,
  currentYear: AcademicYear | null
): YearStatus {

  if (year.isCurrent) {
    return 'current';
  }

  if (!currentYear) {
    return null;
  }

  if (year.startDate > currentYear.endDate) {
    return 'upcoming';
  }

  if (year.endDate < currentYear.startDate) {
    return 'past';
  }

  return null;
}


// =====================================================
// Dates
// =====================================================

// Arabic month names (أيلول، تشرين الأول ...) with Latin digits,
// the same locale as the attendance pages.
const DATE_LOCALE_AR = 'ar-JO-u-nu-latn';
const DATE_LOCALE_EN = 'en-GB';

export function getDateLocale(isArabic: boolean): string {
  return isArabic ? DATE_LOCALE_AR : DATE_LOCALE_EN;
}

// API date ("2025-09-01T00:00:00" or "2025-09-01") -> local Date at midnight.
// Only the date part is read, so the time zone never moves the day.
export function fromApiDate(value: string): Date {
  const [year, month, day] = value
    .substring(0, 10)
    .split('-')
    .map(Number);

  return new Date(year, month - 1, day);
}

// Date -> "YYYY-MM-DD" using the LOCAL date parts.
// Do not use toISOString(): it converts to UTC, so in Amman (UTC+3)
// a date picked at midnight would become the previous day.
export function toApiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// "2026-09-01T00:00:00" -> "1 أيلول 2026" or "1 September 2026".
export function formatLongDate(
  value: string,
  isArabic: boolean
): string {
  return new Intl.DateTimeFormat(getDateLocale(isArabic), {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(fromApiDate(value));
}

// Number of days from start to end, both days included.
export function countDays(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;

  // Math.round absorbs the one-hour shift of daylight saving time.
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}


// =====================================================
// Form validation
// =====================================================

// The end date must be after the start date (the backend checks it too).
// Put it on the end date control; getStart reads the start date control.
// When the start date changes, call endDate.updateValueAndValidity().
export function endAfterStartValidator(
  getStart: () => Date | null
): ValidatorFn {

  return (control: AbstractControl<Date | null>): ValidationErrors | null => {
    const start = getStart();
    const end = control.value;

    if (!start || !end) {
      return null;
    }

    return end > start ? null : { endBeforeStart: true };
  };
}

// The day after a date (the earliest end date the picker allows).
export function nextDay(date: Date | null): Date | null {
  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}
