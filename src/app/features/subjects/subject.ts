import { TeacherListDto } from '../../core/models/teacher';
import { TeacherAssignment } from '../../core/models/teacher-assignment';


// =========================
// Shared types and helpers of the Subjects section
// =========================

// The two tabs of the Subjects page (Admin and Assistant Principal).
// - class:   the subjects of one section (teacher assignments)
// - catalog: the general list of school subjects
export type SubjectsTab = 'class' | 'catalog';


// One academic term in the term dropdown, with the name of its year.
export interface TermOption {
  academicTermId: number;
  nameAr: string;
  nameEn: string;
  yearName: string;
  startDate: string;
  isCurrent: boolean;
}


// One row of the section subjects table.
export interface ClassSubjectRow {
  assignment: TeacherAssignment;

  // Subject name in the current language.
  subjectName: string;

  // Teacher name in the current language (comes with the assignment).
  teacherName: string;

  // true when the teacher's account is inactive (the admin should pick another teacher).
  teacherInactive: boolean;
}


// Counters shown above the section subjects table.
export interface ClassSubjectsCounts {
  total: number;
  active: number;
  inactive: number;
}


// The default passing mark of a new subject in a section.
export const DEFAULT_PASSING_MARK = 50;


// One teacher in the teacher field of the assignment form.
// Holds only what the field needs: the id (sent to the API),
// the number and the name in both languages (shown in the field).
// It comes from two places:
// - a search result (GET /api/teachers?search=...) → teacherOptionFromDto()
// - the current teacher of the edited assignment → teacherOptionFromAssignment()
export interface TeacherOption {
  teacherId: number;
  teacherNumber: string;
  nameAr: string;
  nameEn: string;
}


// Joins the name parts with one space (each part trimmed, empty parts skipped).
function joinNameParts(parts: string[]): string {

  return parts
    .map(part => (part ?? '').trim())
    .filter(part => part !== '')
    .join(' ');
}


// A search result → a teacher option.
export function teacherOptionFromDto(teacher: TeacherListDto): TeacherOption {

  return {
    teacherId: teacher.teacherId,
    teacherNumber: teacher.teacherNumber,
    nameAr: joinNameParts([
      teacher.firstNameAr,
      teacher.fatherNameAr,
      teacher.grandFatherNameAr,
      teacher.familyNameAr,
    ]),
    nameEn: joinNameParts([
      teacher.firstNameEn,
      teacher.fatherNameEn,
      teacher.grandFatherNameEn,
      teacher.familyNameEn,
    ]),
  };
}


// The current teacher of an assignment → a teacher option.
export function teacherOptionFromAssignment(
  assignment: TeacherAssignment
): TeacherOption {

  return {
    teacherId: assignment.teacherId,
    teacherNumber: assignment.teacherNumber,
    nameAr: assignment.teacherNameAr,
    nameEn: assignment.teacherNameEn,
  };
}


// "First Term · 2026/2027" in the current language.
export function getTermLabel(
  term: TermOption,
  isArabic: boolean
): string {

  const name = isArabic ? term.nameAr : term.nameEn;

  return term.yearName
    ? `${name} · ${term.yearName}`
    : name;
}