// Student grades (SMS API Reference, section 10).
//
// The grades page uses three endpoints:
//   - GET  /api/studentgrades/sheet?teacherAssignmentId=  → GradeSheet
//   - POST /api/studentgrades/bulk                        → BulkGradesResult
//   - GET  /api/studentgrades/{studentGradeId}/history    → GradeHistory
//
// The sheet = the assessments of one section (columns) × the students
// actively enrolled in it (rows), with each student's total and result.
// The total and the result are calculated by the backend:
//   - total (out of 100) stays null until every component has at least one
//     assessment, the student has every mark, and the weights add up to 100.
//     A missing mark is never counted as zero.
//   - isPassed = total >= passingMark (the passing mark of the subject plan),
//     and null while total is null.


// One component of the subject plan, as the sheet shows it (column group).
export interface GradeSheetComponent {
  subjectPlanComponentId: number;

  nameAr: string;
  nameEn: string;

  // Part of the total (out of 100).
  weight: number;

  // true = open component (the teacher adds its assessments, e.g. quizzes).
  teacherAddsAssessments: boolean;

  order: number;

  // 0 on an open component = the teacher has not added an assessment yet.
  assessmentCount: number;
}


// One assessment (one column of the sheet).
// The sheet returns them grouped by component, in the order of the components.
export interface GradeSheetAssessment {
  assessmentId: number;
  subjectPlanComponentId: number;

  nameAr: string;
  nameEn: string;

  maxMark: number;

  order: number;

  // true = created by the system from a fixed component (e.g. the final exam).
  isFixed: boolean;
}


// One mark of a student.
// studentGradeId: null = no mark yet.
export interface GradeSheetMark {
  assessmentId: number;
  studentGradeId: number | null;
  mark: number | null;

  // true = the mark was changed after it was first entered
  // (its history has at least one change). false when there is no mark.
  isEdited: boolean;
}


// A student's score in one component (out of the component's weight).
export interface GradeSheetComponentScore {
  subjectPlanComponentId: number;
  score: number | null;
}


// One student (one row of the sheet). Sorted by Arabic name by the backend.
export interface GradeSheetStudent {
  studentId: number;
  studentNumber: string;

  studentNameAr: string;
  studentNameEn: string;

  // In the order of the sheet's assessments.
  marks: GradeSheetMark[];

  // In the order of the sheet's components (not shown on the page).
  componentScores: GradeSheetComponentScore[];

  // Out of 100, or null (see the top of this file).
  total: number | null;

  isPassed: boolean | null;
}


// GET /api/studentgrades/sheet?teacherAssignmentId={id}
export interface GradeSheet {
  teacherAssignmentId: number;

  subjectAr: string;
  subjectEn: string;

  classNameAr: string;
  classNameEn: string;

  sectionAr: string;
  sectionEn: string;

  // null = the administration has not made the subject plan yet.
  subjectPlanId: number | null;

  // The passing mark of the subject plan (null when there is no plan).
  passingMark: number | null;

  // true after the first mark (only the Admin can unlock it).
  isPlanLocked: boolean;

  totalWeight: number;

  // The term's grades are closed by the Admin (API Reference, section 7):
  // the sheet is read-only for everyone. Not the same as isPlanLocked.
  areGradesClosed: boolean;

  // false = no plan yet, its weights are not 100, or the term's grades
  // are closed: the sheet is read-only.
  canEnterGrades: boolean;

  components: GradeSheetComponent[];
  assessments: GradeSheetAssessment[];
  students: GradeSheetStudent[];
}


// One row of POST /api/studentgrades/bulk.
// Creates the mark, or changes it when the student already has one.
export interface BulkGradeMark {
  studentId: number;
  assessmentId: number;
  mark: number;
}


// Body of POST /api/studentgrades/bulk (at most 2000 marks).
// All or nothing: one wrong row → 400 and nothing is saved.
export interface BulkGradesRequest {
  teacherAssignmentId: number;
  marks: BulkGradeMark[];
}


// Response of POST /api/studentgrades/bulk.
// sheet has the same shape as GET /api/studentgrades/sheet,
// so the page redraws without a second request.
export interface BulkGradesResult {
  created: number;
  updated: number;
  unchanged: number;
  sheet: GradeSheet;
}


// The most marks one bulk request can save (API Reference, section 10).
export const BULK_GRADES_LIMIT = 2000;


// =====================================================
// A mark's history
// GET /api/studentgrades/{studentGradeId}/history
// =====================================================
//
// Readers: Admin, AssistantPrincipal and the teacher who owns the assignment
// (another teacher gets 400, an unknown mark 404).
// It can always be read, also when the term's grades are closed.
// Every time field is UTC without a trailing "Z" (read it with fromApiDateTime).
// A name is first name + family name.


// One change of the mark (old → new).
export interface GradeChange {
  oldMark: number;
  newMark: number;

  changedByUserId: number;
  changedByNameAr: string;
  changedByNameEn: string;

  changedAt: string;
}


export interface GradeHistory {
  studentGradeId: number;

  // The mark now.
  mark: number;

  // Who entered the mark first, and when.
  recordedByUserId: number;
  recordedByNameAr: string;
  recordedByNameEn: string;
  recordedAt: string;

  // The last edit: null when the mark was never changed.
  editedByUserId: number | null;
  editedByNameAr: string | null;
  editedByNameEn: string | null;
  editedAt: string | null;

  // Every change, newest first. [] when the mark was never changed.
  // The oldest row's oldMark is the mark as first entered.
  // Marks changed before 2026-10-21 have no rows here,
  // but their last edit still shows in editedBy / editedAt.
  changes: GradeChange[];
}
