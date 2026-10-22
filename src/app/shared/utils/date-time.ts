// Shared helpers for the TIME fields of the API
// (recordedAt, editedAt, changedAt, gradesClosedAt ...).
//
// These fields are stored in UTC but arrive WITHOUT a trailing "Z"
// (for example "2026-10-08T19:18:38.8039322", which is 22:18 in Amman).
// Parsed as-is, the browser treats them as local time and shows them
// 3 hours early. So every time field is read with fromApiDateTime().
//
// Date-only fields (a term's start and end, an attendance date) are
// calendar dates, not times: do NOT use these helpers for them.


// Arabic month names with Latin digits (the same locale as the
// attendance and academic years pages), and English with day first.
const LOCALE_AR = 'ar-JO-u-nu-latn';
const LOCALE_EN = 'en-GB';


// UTC time from the API -> Date (shown later in the browser's local time).
export function fromApiDateTime(value: string): Date {

  // The first 19 characters are "2026-10-08T19:18:38".
  // The fraction of a second is dropped: it is not shown anywhere,
  // and the backend sends it with a different number of digits each time.
  return new Date(`${value.slice(0, 19)}Z`);
}


// "2026-10-21T08:42:00" -> "21 تشرين الأول 2026، 11:42 ص" or "21 October 2026, 11:42".
export function formatApiDateTime(
  value: string,
  isArabic: boolean
): string {
  return new Intl.DateTimeFormat(isArabic ? LOCALE_AR : LOCALE_EN, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(fromApiDateTime(value));
}


// The local day of a UTC time, without the time:
// "2026-10-21T22:30:00" -> "22 تشرين الأول 2026" (already the 22nd in Amman).
export function formatApiDateTimeAsDate(
  value: string,
  isArabic: boolean
): string {
  return new Intl.DateTimeFormat(isArabic ? LOCALE_AR : LOCALE_EN, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(fromApiDateTime(value));
}
