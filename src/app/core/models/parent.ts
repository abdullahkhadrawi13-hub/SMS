import { StudentStatus } from './student';
import { UserRole } from './user-role';


// How a parent is related to a child (API Reference, section 14).
// Sent as a number by the API, like every enum.
// A student has at most one father and one mother; guardians have no limit.
export enum ParentRelationship {
  Father = 0,
  Mother = 1,
  Guardian = 2,
}

// Every relationship, in the order they are shown (father, mother, guardian).
export const PARENT_RELATIONSHIPS: ParentRelationship[] = [
  ParentRelationship.Father,
  ParentRelationship.Mother,
  ParentRelationship.Guardian,
];


// The translation key of a relationship (used in chips and buttons).
export function getRelationshipTranslationKey(
  relationship: ParentRelationship
): string {

  switch (relationship) {
    case ParentRelationship.Father:
      return 'PARENTS.RELATIONSHIP.FATHER';

    case ParentRelationship.Mother:
      return 'PARENTS.RELATIONSHIP.MOTHER';

    case ParentRelationship.Guardian:
      return 'PARENTS.RELATIONSHIP.GUARDIAN';

    default:
      return 'PARENTS.RELATIONSHIP.UNKNOWN';
  }
}


// One child of a parent (ParentDto.children).
// Class and section are the child's current ones.
export interface ParentChildDto {
  studentId: number;
  studentNumber: string;

  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  classId: number;
  classNameAr: string;
  classNameEn: string;

  sectionId: number;
  sectionAr: string;
  sectionEn: string;

  relationship: ParentRelationship;

  // The student's login account.
  isActive: boolean;

  // The student's academic status (separate from isActive).
  studentStatus: StudentStatus;
}


// One parent, the same shape for every parents endpoint (ParentDto).
// The children are sorted by student number.
export interface ParentDto {
  parentId: number;
  userId: number;

  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  loginId: string;

  // The parent's own number (the one shown on the absentees list).
  phoneNumber: string;

  isActive: boolean;
  mustChangePassword: boolean;
  role: UserRole;

  children: ParentChildDto[];
}


// One child sent when creating a parent, or when linking a child.
// relationship is required (missing → 400 "Relationship is required.").
export interface ParentChildRequest {
  studentId: number;
  relationship: ParentRelationship;
}


// POST /api/parents
// children is optional: an empty array creates the account only.
export interface CreateParentRequest {
  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  loginId: string;
  temporaryPassword: string;
  phoneNumber: string;

  children: ParentChildRequest[];
}


// PUT /api/parents/{parentId} (UpdateUserDto, the same body as editing a teacher).
// Every field is required. Children are linked and unlinked separately.
export interface UpdateParentRequest {
  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  loginId: string;
  phoneNumber: string;
}
