import { StudentStatus } from '../../../core/models/student';
import {
  StudentGradesSubject,
  StudentGradesTerm,
} from '../../../core/models/student-grades-report';

// Shared helpers of one student's grades (read only).
// Used by three screens:
//   - the "Grades" tab of the student details (staff: Admin, AssistantPrincipal)
//   - the student's Grades page («علاماتي»)
//   - the parent's Grades page («علامات أبنائي»)
// The models sent by the API are in core/models/student-grades-report.ts.


// Who is looking at the grades:
//   staff:  every term, the history button on each saved mark,
//           the "grades are closed" chip, and the messages for the staff.
//   portal: the student or the parent. Current term only, no history.
export type StudentGradesViewer = 'staff' | 'portal';


// The result of a subject, as the result badge shows it.
export type SubjectResult = 'passed' | 'failed' | 'incomplete';

export function getSubjectResult(subject: StudentGradesSubject): SubjectResult {

  if (subject.isPassed === true) {
    return 'passed';
  }

  if (subject.isPassed === false) {
    return 'failed';
  }

  return 'incomplete';
}

// The result badge text (the same keys as the grade sheet).
export const RESULT_KEYS: Record<SubjectResult, string> = {
  passed: 'GRADES.SHEET.RESULT.PASSED',
  failed: 'GRADES.SHEET.RESULT.FAILED',
  incomplete: 'GRADES.SHEET.RESULT.INCOMPLETE',
};


// The counters above the cards. Counted from the backend's isPassed:
// the frontend never decides passed / failed itself.
export interface StudentGradesCounts {
  subjects: number;
  passed: number;
  failed: number;
  incomplete: number;
}

export function countSubjects(subjects: StudentGradesSubject[]): StudentGradesCounts {

  const counts: StudentGradesCounts = {
    subjects: subjects.length,
    passed: 0,
    failed: 0,
    incomplete: 0,
  };

  for (const subject of subjects) {
    counts[getSubjectResult(subject)]++;
  }

  return counts;
}


// true = the student's record in that term is active: the subjects are shown.
// Otherwise the backend sends no subjects, and a message is shown instead.
export function isActiveRecord(term: StudentGradesTerm): boolean {
  return term.studentStatus === StudentStatus.Active;
}


// "First term, 2026/2027" (STUDENT_GRADES.TERM_LABEL).
// The year is added because every year has a term with the same name.
export function getTermLabelParams(
  term: StudentGradesTerm,
  isArabic: boolean
): { term: string; year: string } {

  return {
    term: isArabic ? term.termNameAr : term.termNameEn,
    year: term.yearName,
  };
}


// "Grade 1, section B" (STUDENT_GRADES.CLASS_SECTION).
export function getClassSectionParams(
  item: Pick<StudentGradesTerm, 'classNameAr' | 'classNameEn' | 'sectionAr' | 'sectionEn'>,
  isArabic: boolean
): { class: string; section: string } {

  return {
    class: isArabic
      ? item.classNameAr || item.classNameEn
      : item.classNameEn || item.classNameAr,
    section: isArabic
      ? item.sectionAr || item.sectionEn
      : item.sectionEn || item.sectionAr,
  };
}


// A record that is not active: the icon and the message.
// The staff gets one message per status (with "the marks are kept").
// The student and the parent get one general message.
export interface StatusMessage {
  icon: string;
  key: string;
}

const STATUS_ICONS: Record<StudentStatus, string> = {
  [StudentStatus.Active]: 'school',
  [StudentStatus.Inactive]: 'person_off',
  [StudentStatus.Graduated]: 'workspace_premium',
  [StudentStatus.Transferred]: 'swap_horiz',
};

const STAFF_STATUS_KEYS: Record<StudentStatus, string> = {
  [StudentStatus.Active]: '',
  [StudentStatus.Inactive]: 'STUDENT_GRADES.STATUS.STAFF_INACTIVE',
  [StudentStatus.Graduated]: 'STUDENT_GRADES.STATUS.STAFF_GRADUATED',
  [StudentStatus.Transferred]: 'STUDENT_GRADES.STATUS.STAFF_TRANSFERRED',
};

export function getRecordStatusMessage(
  status: StudentStatus,
  viewer: StudentGradesViewer
): StatusMessage {

  return {
    icon: viewer === 'staff' ? STATUS_ICONS[status] : 'person_off',
    key: viewer === 'staff'
      ? STAFF_STATUS_KEYS[status]
      : 'STUDENT_GRADES.STATUS.PORTAL',
  };
}


// The parent's page: a child whose status (in the Students table, from
// GET /api/parents/me) is not Active. No grades request is sent for them:
// they have no record in the current term.
const CHILD_STATUS_KEYS: Record<StudentStatus, string> = {
  [StudentStatus.Active]: '',
  [StudentStatus.Inactive]: 'STUDENT_GRADES.CHILDREN.INACTIVE',
  [StudentStatus.Graduated]: 'STUDENT_GRADES.CHILDREN.GRADUATED',
  [StudentStatus.Transferred]: 'STUDENT_GRADES.CHILDREN.TRANSFERRED',
};

export function getChildStatusMessage(status: StudentStatus): StatusMessage {
  return {
    icon: STATUS_ICONS[status],
    key: CHILD_STATUS_KEYS[status],
  };
}
