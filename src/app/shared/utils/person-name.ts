// Shared helpers for the four-part names of the system
// (users, students, teachers, parents: first / father / grandfather / family,
// in Arabic and in English).
//
// Every function receives isArabic (the language of the page) instead of
// reading it by itself, so a computed() that calls it updates as soon as
// the language changes:
//
//   readonly name = computed(() =>
//     getShortName(user, this.language.currentDirection() === 'rtl')
//   );
//
// Used by: the navbar, the profile dialog and the welcome of the dashboards.
// (parents.ts, teacher-details and absentees-list still have their own
// copies of these functions; they can move here in a later cleanup.)


// Anything that has the four-part name in Arabic and English.
// LoginResponse, StudentListDto, TeacherListDto and ParentDto all match it.
export interface FourPartName {
  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;
}


// Full four-part name in Arabic: "محمد يوسف حسن العمري".
export function getArabicName(person: FourPartName): string {
  return [
    person.firstNameAr,
    person.fatherNameAr,
    person.grandFatherNameAr,
    person.familyNameAr
  ]
    .filter(Boolean)
    .join(' ');
}


// Full four-part name in English: "Mohammad Yousef Hasan Al-Omari".
export function getEnglishName(person: FourPartName): string {
  return [
    person.firstNameEn,
    person.fatherNameEn,
    person.grandFatherNameEn,
    person.familyNameEn
  ]
    .filter(Boolean)
    .join(' ');
}


// Full four-part name in the language of the page
// (falls back to the other language when it is empty).
export function getFullName(
  person: FourPartName,
  isArabic: boolean
): string {
  return isArabic
    ? getArabicName(person) || getEnglishName(person)
    : getEnglishName(person) || getArabicName(person);
}


// First name + family name in the language of the page:
// "محمد العمري" / "Mohammad Al-Omari".
// The name of the navbar and of the welcome on the dashboards.
export function getShortName(
  person: FourPartName,
  isArabic: boolean
): string {

  const arabic = [person.firstNameAr, person.familyNameAr]
    .filter(Boolean)
    .join(' ');

  const english = [person.firstNameEn, person.familyNameEn]
    .filter(Boolean)
    .join(' ');

  return isArabic
    ? arabic || english
    : english || arabic;
}


// The first letter of the first name and of the family name,
// in the language of the page (the round avatar): "مع" / "MA".
// A zero-width non-joiner (‌) keeps two Arabic letters apart,
// so they do not join into one word.
export function getInitials(
  person: FourPartName,
  isArabic: boolean
): string {

  const first = isArabic
    ? person.firstNameAr || person.firstNameEn
    : person.firstNameEn || person.firstNameAr;

  const family = isArabic
    ? person.familyNameAr || person.familyNameEn
    : person.familyNameEn || person.familyNameAr;

  return [first, family]
    .map(name => name?.trim().charAt(0) ?? '')
    .filter(Boolean)
    .join('‌')
    .toUpperCase();
}
