// =====================================================
// Attendance models (SMS API Reference - section 11)
// =====================================================

// AttendanceStatus is sent and received as a number, not text:
// 0 = Present, 1 = Absent.
export type AttendanceStatus = 0 | 1;

export const ATTENDANCE_PRESENT: AttendanceStatus = 0;
export const ATTENDANCE_ABSENT: AttendanceStatus = 1;


// GET /api/attendance/my-access
// Tells whether the current user can record attendance, and for which dates:
//   Admin / AssistantPrincipal  -> canRecord: true,  todayOnly: false
//   The attendance officer      -> canRecord: true,  todayOnly: true
//   Any other teacher           -> canRecord: false, todayOnly: false
export interface AttendanceAccess {
  canRecord: boolean;
  todayOnly: boolean;
}


// One student row inside the attendance sheet.
// attendanceId = null means the student is not recorded yet.
export interface AttendanceSheetStudent {
  studentId: number;
  studentNumber: string;
  studentNameAr: string;
  studentNameEn: string;
  attendanceId: number | null;
  status: AttendanceStatus | null;
}


// GET /api/attendance/sheet
export interface AttendanceSheet {
  date: string;
  academicTermId: number;
  classId: number;
  sectionId: number;
  students: AttendanceSheetStudent[];
}


// POST /api/attendance
export interface AttendanceEntry {
  studentId: number;
  status: AttendanceStatus;
}

export interface RecordAttendanceRequest {
  date: string;
  entries: AttendanceEntry[];
}


// PUT /api/attendance/{attendanceId}
export interface UpdateAttendanceRequest {
  status: AttendanceStatus;
}


// One saved attendance record (AttendanceDto in the backend).
// Returned by:
//   POST /api/attendance                        (the records just created)
//   GET  /api/attendance/by-student/{studentId} (one student's history)
//   GET  /api/attendance/by-date/{date}         (every student on one day)
export interface AttendanceRecord {
  attendanceId: number;
  studentId: number;
  studentNumber: string;
  studentFirstNameAr: string;
  studentFirstNameEn: string;
  academicTermId: number;

  // Date only: "YYYY-MM-DD".
  date: string;

  status: AttendanceStatus;

  // Audit info. The two time fields are UTC without a trailing "Z":
  // always read them with fromApiDateTime().
  recordedByUserId: number;
  recordedAt: string;
  editedByUserId: number | null;
  editedAt: string | null;
}


// GET /api/attendance/daily-summary
export interface AttendanceSummarySection {
  classId: number;
  classNameAr: string;
  classNameEn: string;
  sectionId: number;
  sectionAr: string;
  sectionEn: string;
  studentCount: number;
  recordedCount: number;
  absentCount: number;
  isComplete: boolean;
}

export interface AttendanceDailySummary {
  date: string;
  academicTermId: number;
  totalSections: number;
  completedSections: number;
  totalAbsent: number;
  sections: AttendanceSummarySection[];
}
