import { StudentStatus } from './student';

// The student and parent home page (SMS API Reference, section 15):
//   GET /api/dashboard/student/me  (Student) → StudentDashboardCard
//   GET /api/dashboard/parent/me   (Parent)  → ParentDashboardResponse

// The current term ("الفصل الأول · 2026/2027").
export interface DashboardCurrentTerm {
  academicTermId: number;
  termNameAr: string;
  termNameEn: string;
  yearName: string;
}

// The current term's attendance, recorded days only
// (totalRecorded = presentCount + absentCount).
export interface DashboardAttendance {
  presentCount: number;
  absentCount: number;
  totalRecorded: number;
  lastAbsenceDate: string | null;   // date only: "2026-11-12"
}

// One of the newest 5 saved marks of the current term (newest first).
export interface DashboardLatestMark {
  subjectAr: string;
  subjectEn: string;
  assessmentNameAr: string;
  assessmentNameEn: string;
  mark: number;
  maxMark: number;
  savedAt: string;    // UTC without "Z": read with fromApiDateTime
  isEdited: boolean;
}

// One student's card (the student's own, or one child of a parent).
export interface StudentDashboardCard {
  studentId: number;
  studentNumber: string;
  studentNameAr: string;    // first + father + family name
  studentNameEn: string;
  classNameAr: string;
  classNameEn: string;
  sectionAr: string;
  sectionEn: string;
  studentStatus: StudentStatus;

  // null (with attendance null and latestMarks []) = no current term.
  currentTerm: DashboardCurrentTerm | null;
  attendance: DashboardAttendance | null;
  latestMarks: DashboardLatestMark[];
}

export interface ParentDashboardResponse {
  children: StudentDashboardCard[];   // active children first
}
