import { SubjectDto } from '../../core/models/subject';
import { SubjectPlan } from '../../core/models/subject-plan';
import { TeacherListDto } from '../../core/models/teacher';
import { TeacherAssignment } from '../../core/models/teacher-assignment';


// =========================
// Shared types and helpers of the Subjects section
// =========================

// The three tabs of the Subjects page (Admin and Assistant Principal).
// - plans:       the subject plans of one class (components, weights, passing mark)
// - assignments: the subjects of one section and their teachers (teacher assignments)
// - catalog:     the general list of school subjects
export type SubjectsTab = 'plans' | 'assignments' | 'catalog';

export const SUBJECTS_TABS: SubjectsTab[] = ['plans', 'assignments', 'catalog'];


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

  // The subject plan the section follows (null = no plan, or not loaded yet).
  plan: SubjectPlan | null;
}


// Counters shown above the section subjects table.
export interface ClassSubjectsCounts {
  total: number;
  active: number;
  inactive: number;
}


// =========================
// Subject plans
// =========================

// The state of a plan, shown as a badge in the plans tab,
// the plan details page and the assignments tab.
// - locked:     marks exist (or locked by hand); only the Admin can unlock it
// - ready:      the weights add up to 100, marks can be entered
// - incomplete: the weights add up to less than 100, no marks can be entered
export type PlanStatus = 'locked' | 'ready' | 'incomplete';

export function getPlanStatus(plan: SubjectPlan): PlanStatus {

  if (plan.isLocked) {
    return 'locked';
  }

  return plan.isComplete ? 'ready' : 'incomplete';
}


// The badge of each state: icon + translation key + CSS class.
export const PLAN_STATUS_BADGE: Record<
  PlanStatus,
  { icon: string; labelKey: string; cssClass: string }
> = {
  locked: { icon: 'lock', labelKey: 'SUBJECTS.PLAN_STATUS.LOCKED', cssClass: 'neutral' },
  ready: { icon: 'check_circle', labelKey: 'SUBJECTS.PLAN_STATUS.READY', cssClass: 'ok' },
  incomplete: { icon: 'warning_amber', labelKey: 'SUBJECTS.PLAN_STATUS.INCOMPLETE', cssClass: 'warn' },
};


// The weights of a plan add up to this number before marks can be entered.
export const FULL_WEIGHT = 100;

// The default passing mark of a new plan.
export const DEFAULT_PASSING_MARK = 50;

// The colors of the plan components, in their order (dots and weight bar).
// After the last one the colors start again.
const COMPONENT_COLORS = [
  '#5b8def', // soft blue
  '#e8845c', // soft coral
  '#4fb3a9', // soft teal
  '#d16d9e', // soft rose
  '#8c7ae6', // soft lavender
  '#e3b448', // soft mustard
];

export function componentColor(index: number): string {
  return COMPONENT_COLORS[index % COMPONENT_COLORS.length];
}


// The components of a plan, sorted by their order.
export function sortComponents<T extends { order: number }>(components: T[]): T[] {
  return [...components].sort((a, b) => a.order - b.order);
}


// A number for display: 50.00 → "50", 12.5 → "12.5".
export function formatNumber(value: number | null | undefined): string {

  if (value === null || value === undefined) {
    return '';
  }

  return String(Math.round(Number(value) * 100) / 100);
}


// One subject in the "add subject to section" form, with the state of its plan
// for the selected term and class. A subject without a plan cannot be chosen.
export interface SubjectOption {
  subject: SubjectDto;
  plan: SubjectPlan | null;
}


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