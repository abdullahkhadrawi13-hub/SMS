// Shared helpers of the Parents section (used by several components).

import {
  ParentChildDto,
  ParentDto,
  ParentRelationship
} from '../../core/models/parent';
import { Student } from '../../core/models/student';


// Anything that has the four-part name in Arabic and English
// (a parent, a child, a student).
interface FourPartName {
  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;
}


// True when the page is in Arabic.
export function isArabicPage(): boolean {
  return document.documentElement.lang === 'ar';
}


// Full four-part name in Arabic.
export function getArabicName(person: FourPartName): string {
  return [
    person.firstNameAr,
    person.fatherNameAr,
    person.grandFatherNameAr,
    person.familyNameAr,
  ]
    .filter(Boolean)
    .join(' ');
}


// Full four-part name in English.
export function getEnglishName(person: FourPartName): string {
  return [
    person.firstNameEn,
    person.fatherNameEn,
    person.grandFatherNameEn,
    person.familyNameEn,
  ]
    .filter(Boolean)
    .join(' ');
}


// Full name in the language of the page (falls back to the other language).
export function getFullName(person: FourPartName): string {
  return isArabicPage()
    ? getArabicName(person) || getEnglishName(person)
    : getEnglishName(person) || getArabicName(person);
}


// First name in the language of the page (the chips of the table).
export function getFirstName(person: FourPartName): string {
  return isArabicPage()
    ? person.firstNameAr || person.firstNameEn
    : person.firstNameEn || person.firstNameAr;
}


// First name + family name in the language of the page ("خالد الخطيب").
export function getShortName(person: FourPartName): string {
  return isArabicPage()
    ? `${person.firstNameAr} ${person.familyNameAr}`.trim()
    : `${person.firstNameEn} ${person.familyNameEn}`.trim();
}


// The first letter of the first name and of the family name
// (the avatar of a profile card). A zero-width non-joiner (‌)
// keeps two Arabic letters apart, as in the teacher details.
export function getInitials(person: FourPartName): string {

  const isArabic = isArabicPage();

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


// "الصف الأول / أ" for a child or a student, in the language of the page.
export function getClassSection(
  item: Pick<ParentChildDto | Student, 'classNameAr' | 'classNameEn' | 'sectionAr' | 'sectionEn'>
): string {

  const isArabic = isArabicPage();

  const className = isArabic
    ? item.classNameAr || item.classNameEn
    : item.classNameEn || item.classNameAr;

  const sectionName = isArabic
    ? item.sectionAr || item.sectionEn
    : item.sectionEn || item.sectionAr;

  return [className, sectionName]
    .filter(Boolean)
    .join(' / ');
}


// The father and the mother a student already has.
// The value is the parent's short name ("خالد الخطيب"), shown under
// the relationship buttons so the admin knows who it is.
// Guardians are not listed: a student can have any number of them.
export interface TakenRelationships {
  father: string | null;
  mother: string | null;
}

export const NO_TAKEN_RELATIONSHIPS: TakenRelationships = {
  father: null,
  mother: null,
};


// Works out the taken father / mother from the parents of one student
// (GET /api/parents?studentId=). Each parent has every one of their
// children, so the link to this student is found by studentId.
export function findTakenRelationships(
  parents: ParentDto[],
  studentId: number
): TakenRelationships {

  const taken: TakenRelationships = { father: null, mother: null };

  for (const parent of parents) {

    const child = parent.children.find(c => c.studentId === studentId);

    if (child?.relationship === ParentRelationship.Father) {
      taken.father = getShortName(parent);
    }

    if (child?.relationship === ParentRelationship.Mother) {
      taken.mother = getShortName(parent);
    }
  }

  return taken;
}


// True when this relationship cannot be chosen for the student.
export function isRelationshipTaken(
  taken: TakenRelationships,
  relationship: ParentRelationship
): boolean {

  if (relationship === ParentRelationship.Father) {
    return !!taken.father;
  }

  if (relationship === ParentRelationship.Mother) {
    return !!taken.mother;
  }

  return false;
}
