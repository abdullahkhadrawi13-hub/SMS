// Student rollover (API Reference, section 13).
// Moves the students of an earlier term into the current term, in two steps:
// a preview that changes nothing, then the rollover. Admin only.


// What the backend suggests for one student (a number in the API).
export enum RolloverSuggestion {
  Copy = 0,           // same year: same class and same section
  Promote = 1,        // new year, passed: the next class
  Repeat = 2,         // failed subjects >= failedSubjectsToRepeat
  Graduate = 3,       // passed in a graduation class
  NeedsDecision = 4,  // missing marks, or no subjects this year: the Admin decides
  AlreadyPlaced = 5,  // already placed in the current term: left untouched
  NoTarget = 6        // no active class or section to move to
}


// A subject the student failed: the year result against the passing mark.
// average = the average of the term totals (each out of 100).
export interface RolloverFailedSubject {
  subjectId: number;
  subjectAr: string;
  subjectEn: string;
  average: number;
  passingMark: number;
}


// A subject with a missing mark (or with no teacher in the student's section).
// The API Reference shows this list only as [], so the shape is assumed
// to be the same as a failed subject without the numbers.
export interface RolloverMissingSubject {
  subjectId: number;
  subjectAr: string;
  subjectEn: string;
}


// One student of the preview (also the shape of a "notPlaced" item).
// target = where the student goes if promoted. A repeater stays in "from".
// The target is null when there is nowhere to go (NoTarget, or a graduate).
export interface RolloverStudent {
  studentId: number;
  studentNumber: string;
  studentNameAr: string;
  studentNameEn: string;

  fromClassId: number;
  fromClassNameAr: string;
  fromClassNameEn: string;
  fromSectionId: number;
  fromSectionAr: string;
  fromSectionEn: string;

  targetClassId: number | null;
  targetClassNameAr: string | null;
  targetClassNameEn: string | null;
  targetSectionId: number | null;
  targetSectionAr: string | null;
  targetSectionEn: string | null;

  suggestion: RolloverSuggestion;

  failedSubjects: RolloverFailedSubject[];
  missingGradeSubjects: RolloverMissingSubject[];

  // Empty for normal cases; the reason when the Admin needs to look.
  noteAr: string;
  noteEn: string;
}


// A term of the old year whose grades are still open.
export interface RolloverOpenTerm {
  academicTermId: number;
  nameAr: string;
  nameEn: string;
}


// GET /api/rollover/preview?fromAcademicTermId={id}
export interface RolloverPreview {
  fromAcademicTermId: number;
  fromTermNameAr: string;
  fromTermNameEn: string;

  toAcademicTermId: number;
  toTermNameAr: string;
  toTermNameEn: string;

  // true = the source term is in an earlier year (promote / repeat / graduate).
  isNewYear: boolean;

  // From the school settings: this many failed subjects (or more)
  // make the backend suggest "Repeat".
  failedSubjectsToRepeat: number;

  // = isNewYear: the rollover closes the old year's grades for good.
  willCloseGrades: boolean;

  // The old year's name, which the Admin must type to confirm.
  // null for a same-year rollover.
  fromYearName: string | null;

  // The old year's terms whose grades are still open.
  // The rollover is refused until this list is empty. [] in the same year.
  openTerms: RolloverOpenTerm[];

  students: RolloverStudent[];
}


// POST /api/rollover
export interface RolloverRequest {
  fromAcademicTermId: number;

  // The students the Admin keeps back (new year only).
  // Everyone else is promoted or graduated.
  repeatStudentIds: number[];

  // The logged-in Admin's own password, on every rollover.
  adminPassword: string;

  // New year only: must match fromYearName. null in the same year.
  confirmYearName: string | null;
}


// The answer of POST /api/rollover.
export interface RolloverResult {
  copied: number;
  promoted: number;
  repeated: number;
  graduated: number;
  alreadyPlaced: number;

  // Students that could not be placed, with the reason (suggestion = NoTarget).
  notPlaced: RolloverStudent[];
}
