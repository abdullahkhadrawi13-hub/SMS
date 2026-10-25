// Counted words ("3 students", "١ شعبة") need a different form for each
// number in Arabic, so one translation with {{count}} is not enough:
//
//   0  → لا يوجد طلاب        (ZERO)
//   1  → طالب واحد           (ONE)
//   2  → طالبان              (TWO)
//   3–10  → 3 طلاب           (FEW)
//   11–99 → 25 طالبًا         (MANY)
//   100, 200, ... → 100 طالب (OTHER)
//
// These are the standard (CLDR) Arabic plural rules. English uses
// the same key names; its FEW / MANY / OTHER texts are simply the same.
//
// Usage in a template:
//   {{ pluralKey('CLASSES.COUNTS.STUDENTS', n) | translate: { count: n } }}
// with these keys in ar.json / en.json:
//   "STUDENTS": { "ZERO": ..., "ONE": ..., "TWO": ..., "FEW": ..., "MANY": ..., "OTHER": ... }

export type PluralForm = 'ZERO' | 'ONE' | 'TWO' | 'FEW' | 'MANY' | 'OTHER';


// The plural form of a whole number.
export function pluralForm(count: number): PluralForm {
  const lastTwoDigits = count % 100;

  if (count === 0) return 'ZERO';
  if (count === 1) return 'ONE';
  if (count === 2) return 'TWO';
  if (lastTwoDigits >= 3 && lastTwoDigits <= 10) return 'FEW';
  if (lastTwoDigits >= 11 && lastTwoDigits <= 99) return 'MANY';

  return 'OTHER';
}


// The translation key of a count:
// pluralKey('CLASSES.COUNTS.STUDENTS', 3) → 'CLASSES.COUNTS.STUDENTS.FEW'
export function pluralKey(baseKey: string, count: number): string {
  return `${baseKey}.${pluralForm(count)}`;
}
