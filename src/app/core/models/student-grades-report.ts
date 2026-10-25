import { StudentStatus } from './student';

// One student's grades, term by term (read only).
//
//   - GET /api/studentgrades/by-student/{studentId}
//       Admin, AssistantPrincipal (any student), Parent (own children only)
//   - GET /api/studentgrades/me
//       Student (themself)
//
// Both return the same shape (StudentGradesReport) and take the same
// optional query (StudentGradesQuery), at most one of its two fields.
//
// The totals and the results are calculated by the backend, with the same
// formula as the grade sheet and the rollover. The frontend never adds marks
// up and never decides passed / failed:
//   - mark: null  = not entered yet (never shown as 0).
//   - score: null = a mark of this component is still missing.
//   - total: null = something is still missing in the subject.
//   - isPassed: true passed, false failed, null incomplete.


// The optional query of both endpoints. Send at most one of the two:
// both together answer 400.
//   - nothing:             every term the student has a record in, newest first
//   - currentOnly: true:   the current term only (terms: [] when no record in it)
//   - academicTermId: 5:   that term only (terms: [] when no record in it)
export interface StudentGradesQuery {
  currentOnly?: boolean;
  academicTermId?: number;
}


// One assessment of a component, with the student's mark.
export interface StudentGradesAssessment {
  assessmentId: number;

  nameAr: string;
  nameEn: string;

  maxMark: number;

  // null = no mark yet (then mark is null too).
  studentGradeId: number | null;
  mark: number | null;

  // true = changed after it was first entered.
  // Shown to the staff only (the history is for the administration).
  isEdited: boolean;
}


// One component of the subject plan (quizzes, first exam, final exam...).
export interface StudentGradesComponent {
  subjectPlanComponentId: number;

  nameAr: string;
  nameEn: string;

  // Part of the total (out of 100).
  weight: number;

  // The student's score out of the weight, or null (a mark is missing).
  score: number | null;

  assessments: StudentGradesAssessment[];
}


// One subject of the term.
export interface StudentGradesSubject {
  subjectId: number;

  subjectAr: string;
  subjectEn: string;

  // false = the subject is in the class's plan, but nobody teaches it in the
  // student's section: no teacher, no components, no marks.
  hasTeacher: boolean;

  teacherAssignmentId: number | null;

  teacherNameAr: string | null;
  teacherNameEn: string | null;

  passingMark: number | null;

  // Out of 100, or null.
  total: number | null;

  isPassed: boolean | null;

  components: StudentGradesComponent[];
}


// One term the student has a record in.
// The class, the section and the status are the student's in THAT term.
export interface StudentGradesTerm {
  academicTermId: number;

  termNameAr: string;
  termNameEn: string;

  // "2026/2027"
  yearName: string;

  isCurrent: boolean;

  classId: number;
  classNameAr: string;
  classNameEn: string;

  sectionId: number;
  sectionAr: string;
  sectionEn: string;

  // Not Active: the student withdrew, graduated or moved to another school
  // during that term. subjects is then [] (the marks are kept, not shown).
  studentStatus: StudentStatus;

  // The administration closed the term's grades.
  areGradesClosed: boolean;

  subjects: StudentGradesSubject[];
}


export interface StudentGradesReport {
  studentId: number;
  studentNumber: string;

  studentNameAr: string;
  studentNameEn: string;

  // Newest first.
  terms: StudentGradesTerm[];
}
