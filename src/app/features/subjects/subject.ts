import { TeacherListDto } from '../../core/services/teachers';
import { TeacherAssignment } from '../../core/services/teacher-assignments';


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

  // Teacher name in the current language ('' when the teacher is not in the teachers list).
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


// Teacher full name (four parts) in the current language.
export function getTeacherFullName(
  teacher: TeacherListDto,
  isArabic: boolean
): string {

  return isArabic
    ? `${teacher.firstNameAr} ${teacher.fatherNameAr} ${teacher.grandFatherNameAr} ${teacher.familyNameAr}`
    : `${teacher.firstNameEn} ${teacher.fatherNameEn} ${teacher.grandFatherNameEn} ${teacher.familyNameEn}`;
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
