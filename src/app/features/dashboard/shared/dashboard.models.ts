import { StudentStatus } from '../../../core/models/student';
import { FourPartName } from '../../../shared/utils/person-name';


// What the role dashboards show.
//
// These are the shapes the dashboard components read (view models),
// not API responses. For now dashboard-sample-data.ts fills them.
// When the backend endpoints are ready, a service will build the same
// shapes from the API, and the components stay as they are.


// A name in both languages (class, section, term, person).
export interface LocalizedName {
  nameAr: string;
  nameEn: string;
}


// ===== Today's attendance (card "حضور اليوم") =====

// How far a section got with today's attendance sheet.
//   complete    every student has a status
//   partial     some students have a status
//   notStarted  nobody has a status yet
export type SectionAttendanceState = 'complete' | 'partial' | 'notStarted';

// One square in the sections map.
export interface DashboardMapSection extends LocalizedName {
  sectionId: number;
  state: SectionAttendanceState;
  studentCount: number;   // students in the section
  recordedCount: number;  // students with a status today
  absentCount: number;    // students marked absent today
}

// One line in the sections map: a class and its sections.
export interface DashboardMapClass extends LocalizedName {
  classId: number;
  sections: DashboardMapSection[];
}

export interface TodayAttendance {
  // Last time the numbers were loaded (a UTC time from the API,
  // read with fromApiDateTime from shared/utils/date-time.ts).
  updatedAt: string;

  sectionsTotal: number;
  sectionsComplete: number;
  sectionsPartial: number;
  sectionsNotStarted: number;

  recordedCount: number;  // students with a status today
  presentCount: number;
  absentCount: number;

  classes: DashboardMapClass[];
}


// ===== The numbers strip (spec: الأرقام المجمّعة) =====

export interface DashboardStats {
  activeStudents: number;
  activeSections: number;
  activeTeachers: number;
  linkedParents: number;    // parents linked to at least one student
  activeClasses: number;

  // The first and last class by level ("الأول إلى العاشر").
  firstClass: LocalizedName | null;
  lastClass: LocalizedName | null;
}


// ===== Needs your attention (card "يحتاج انتباهك") =====

// A section named by its class: "الثامن ج" / "Grade 8 C".
export interface DashboardSectionRef {
  classNameAr: string;
  classNameEn: string;
  sectionNameAr: string;
  sectionNameEn: string;
}

export interface DashboardPartialSection extends DashboardSectionRef {
  recordedCount: number;
  studentCount: number;
}

export interface DashboardAttention {
  notStartedSections: DashboardSectionRef[];
  partialSections: DashboardPartialSection[];

  // Subject plans of the current term whose weights are under 100%
  // (isComplete = false), so teachers cannot enter marks yet.
  incompletePlansCount: number;

  // The person in SchoolSettings.AttendanceResponsibleUserId (null: nobody).
  attendanceOfficer: LocalizedName | null;
}


// ===== The current term (card "الفصل الحالي") =====

export interface DashboardTerm extends LocalizedName {
  yearName: string;          // "2026/2027"
  startDate: string;         // date only: "2026-09-01"
  endDate: string;           // date only: "2027-01-14"
  areGradesClosed: boolean;
}


// ===== Everything one dashboard needs =====

export interface DashboardData {
  today: TodayAttendance;
  stats: DashboardStats;
  attention: DashboardAttention;
  term: DashboardTerm;
}


// ===================================================================
// The Teacher, Student and Parent dashboards
// ===================================================================


// ===== Shared by the three =====

// One cell of a numbers strip (spec: الأرقام المجمّعة).
// The label is a translation key. The caption is either a translation key
// (with its params; a count goes through pluralKey before it gets here)
// or a text already in the UI language (a list of subject names).
export interface DashboardNumber {
  labelKey: string;
  value: number;

  captionKey?: string;
  captionParams?: Record<string, string | number>;
  captionText?: string;

  // The value in red (failed subjects). Default: the normal text colour.
  isBad?: boolean;
}

// A piece of the second line of a notice: a translation key with its
// params, or a text already in the UI language. The pieces are joined by " · ".
export interface NoticePart {
  key?: string;
  params?: Record<string, string | number>;
  text?: string;
}

// One line of a "يحتاج انتباهك" list built by a dashboard
// (the Teacher and Parent dashboards; the Admin one has app-attention-card).
//   warn  yellow triangle   something to do or finish
//   info  blue circle       something to know, nothing to do here
//   bad   red circle        absent today
export interface DashboardNotice {
  id: string;            // for @for track
  tone: 'warn' | 'info' | 'bad';
  titleKey: string;
  titleParams?: Record<string, string | number>;
  parts: NoticePart[];
  linkKey?: string;      // a text link at the end (no action yet)
}


// ===== Teacher (card "علاماتي هذا الفصل") =====

// One section and subject the teacher teaches this term
// (later: GET /api/teacherassignments/mine + the plan + the grade sheet).
export interface TeacherGradesRow {
  teacherAssignmentId: number;

  classNameAr: string;
  classNameEn: string;
  sectionNameAr: string;
  sectionNameEn: string;
  subjectNameAr: string;
  subjectNameEn: string;

  // false: the subject plan is under 100%, so no marks can be entered yet.
  isPlanComplete: boolean;

  studentCount: number;
  completeCount: number;  // students with every mark of the plan entered
  assessmentCount: number;
}

export interface TeacherDashboardData {
  rows: TeacherGradesRow[];
  classCount: number;     // the classes the sections belong to
}


// ===== Student (card "علاماتي هذا الفصل" + "معلوماتي") =====

// The result of one subject this term.
//   passed / failed  every mark is in, the total is compared to the passing mark
//   incomplete       some marks are missing, so there is no total yet
export type SubjectResult = 'passed' | 'failed' | 'incomplete';

// One subject (later: GET /api/studentgrades/me).
export interface StudentSubjectRow extends LocalizedName {
  subjectId: number;
  enteredCount: number;     // assessments with a mark
  assessmentCount: number;  // assessments in the plan
  total: number | null;     // out of 100, null while incomplete
  passingMark: number;
  result: SubjectResult;
}

export interface StudentInfo {
  studentNumber: string;
  classNameAr: string;
  classNameEn: string;
  sectionNameAr: string;
  sectionNameEn: string;
  studentStatus: StudentStatus;
}

export interface StudentDashboardData {
  info: StudentInfo;
  subjects: StudentSubjectRow[];

  // TEMPORARY: there is no attendance endpoint for the student yet.
  absentDays: number;
  lastAbsentDate: string | null;  // date only: "2026-11-10"
}


// ===== Parent (cards "أبنائي") =====

// One child of the parent (later: GET /api/parents/me + the child's grades).
export interface ParentChild extends FourPartName {
  studentId: number;
  studentNumber: string;

  classNameAr: string;
  classNameEn: string;
  sectionNameAr: string;
  sectionNameEn: string;

  subjectCount: number;
  passedCount: number;
  failedCount: number;
  incompleteCount: number;

  // The failed subjects, with the total and the passing mark.
  failedSubjects: { nameAr: string; nameEn: string; total: number; passingMark: number }[];

  // TEMPORARY: there is no attendance endpoint for the parent yet.
  absentDays: number;
  isAbsentToday: boolean;
}

export interface ParentDashboardData {
  children: ParentChild[];
}
