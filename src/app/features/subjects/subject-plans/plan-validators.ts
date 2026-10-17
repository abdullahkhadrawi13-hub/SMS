import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { FULL_WEIGHT } from '../subject';


// Limits of a subject plan (SMS API Reference, section 9).
// The backend checks them too; checking here shows the error before sending.

// A component name: 1 to 100 characters.
export const COMPONENT_NAME_MAX_LENGTH = 100;

// The max mark of a fixed component or a quiz: above 0, up to 999.99.
export const MAX_MARK_LIMIT = 999.99;


// A number in (min, max]: above min and at most max.
// An empty value passes (Validators.required reports it).
function rangeValidator(errorKey: string, min: number, max: number): ValidatorFn {

  return (control: AbstractControl): ValidationErrors | null => {

    const value = control.value;

    if (value === null || value === '') {
      return null;
    }

    const number = Number(value);

    return number > min && number <= max
      ? null
      : { [errorKey]: true };
  };
}


// Passing mark: above 0 and at most 100.
export const passingMarkValidator = rangeValidator('passingMark', 0, FULL_WEIGHT);

// Component weight: above 0 and at most 100.
export const weightValidator = rangeValidator('weight', 0, FULL_WEIGHT);

// Max mark: above 0 and at most 999.99.
export const maxMarkValidator = rangeValidator('maxMark', 0, MAX_MARK_LIMIT);


// The weights of a plan can never add up to more than 100.
// Rounded to 2 decimals so 33.33 + 33.33 + 33.34 is exactly 100.
export function totalWeight(weights: (number | string | null)[]): number {

  const sum = weights.reduce<number>((total, w) => total + (Number(w) || 0), 0);

  return Math.round(sum * 100) / 100;
}
