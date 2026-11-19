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
// Used by: the navbar, the profile dialog, the welcome of the dashboards,
// the students, teachers and parents sections, and the absentees tab
// of the attendance page.
//
// The avatar helpers at the end (getInitials, getInitialsFromFullName,
// getAvatarTone) are the only copy in the project: every list, card and
// dialog that shows a person's round avatar takes them from here.


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


// First name in the language of the page: "سارة" / "Sara"
// (the children chips of the parents table).
export function getFirstName(
  person: FourPartName,
  isArabic: boolean
): string {
  return isArabic
    ? person.firstNameAr || person.firstNameEn
    : person.firstNameEn || person.firstNameAr;
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


// =====================================================
// Avatar: the two letters and the colour
// =====================================================

// Two Arabic letters are kept apart by a zero-width non-joiner,
// so "مع" does not join into one word.
const LETTER_JOINER = '\u200c';

// The Arabic article at the start of a family name.
const ARABIC_ARTICLE = 'ال';

// The letter of one name on the avatar. A family name that starts with
// "ال" gives the letter after it: "الخضراوي" → "خ" (not "ا").
function nameLetter(
  name: string | null | undefined,
  isFamilyName: boolean
): string {

  const word = name?.trim() ?? '';

  if (
    isFamilyName &&
    word.length > ARABIC_ARTICLE.length &&
    word.startsWith(ARABIC_ARTICLE)
  ) {
    return word.charAt(ARABIC_ARTICLE.length);
  }

  return word.charAt(0);
}

function joinLetters(first: string, family: string): string {
  return [first, family]
    .filter(Boolean)
    .join(LETTER_JOINER)
    .toUpperCase();
}


// The first letter of the first name and of the family name,
// in the language of the page (the round avatar):
// "عبدالله الخضراوي" → "عخ", "Mohammad Al-Omari" → "MA".
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

  return joinLetters(
    nameLetter(first, false),
    nameLetter(family, true)
  );
}


// The same two letters when only the full name comes as one string
// (the student in the rollover, the teacher of an assignment).
// The last word stands for the family name: "كريم محمد علي الخطيب" → "كخ".
export function getInitialsFromFullName(
  fullName: string | null | undefined
): string {

  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '';
  }

  return joinLetters(
    nameLetter(words[0], false),
    words.length > 1 ? nameLetter(words[words.length - 1], true) : ''
  );
}


// The avatar colours of the lists: --avatar-1 … --avatar-6 in tokens.css.
const AVATAR_TONES = 6;

// The same colour for the same person on every page
// (a student by studentId, a teacher by teacherId, a parent by parentId).
export function getAvatarTone(id: number): number {
  return (id % AVATAR_TONES) + 1;
}
