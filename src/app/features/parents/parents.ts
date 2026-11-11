// Shared helpers of the Parents section (used by several components).
// The names themselves (full name, short name, initials…) come from
// shared/utils/person-name.ts, like the students and teachers sections.
//
// Every function receives isArabic (the language of the page) instead of
// reading it by itself, so a computed() that calls it updates as soon as
// the language changes.

import {
  ParentChildDto,
  ParentDto,
  ParentRelationship
} from '../../core/models/parent';
import { Student } from '../../core/models/student';
import { getShortName } from '../../shared/utils/person-name';


// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css.
const AVATAR_TONES = 6;

// The same colour for the same person, everywhere
// (a parent by parentId, a child or a student by studentId).
export function getAvatarTone(id: number): number {
  return (id % AVATAR_TONES) + 1;
}


// The separator of a list written in one line: "سارة، عمر" / "Sara, Omar".
export function getListSeparator(isArabic: boolean): string {
  return isArabic ? '، ' : ', ';
}


// "الصف الأول / أ" for a child or a student, in the language of the page.
export function getClassSection(
  item: Pick<ParentChildDto | Student, 'classNameAr' | 'classNameEn' | 'sectionAr' | 'sectionEn'>,
  isArabic: boolean
): string {

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
  studentId: number,
  isArabic: boolean
): TakenRelationships {

  const taken: TakenRelationships = { father: null, mother: null };

  for (const parent of parents) {

    const child = parent.children.find(c => c.studentId === studentId);

    if (child?.relationship === ParentRelationship.Father) {
      taken.father = getShortName(parent, isArabic);
    }

    if (child?.relationship === ParentRelationship.Mother) {
      taken.mother = getShortName(parent, isArabic);
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
