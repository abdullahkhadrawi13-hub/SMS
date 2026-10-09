// =====================================================
// Attendance models (SMS API Reference - section 11)
// =====================================================

// AttendanceStatus is sent and received as a number, not text:
// 0 = Present, 1 = Absent.
export type AttendanceStatus = 0 | 1;

export const ATTENDANCE_PRESENT: AttendanceStatus = 0;
export const ATTENDANCE_ABSENT: AttendanceStatus = 1;


// GET /api/attendance/my-access
// (Not used yet. It will be needed when the page content
// is customized for each role.)
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


// =====================================================
// View models (used only inside the attendance screens)
// =====================================================

// The status chosen on the screen for each student (by studentId).
// null = no status chosen yet.
export type AttendanceDraft = Record<number, AttendanceStatus | null>;

// Emitted by the sheet when the user picks a status for a student.
export interface AttendanceStatusChange {
  studentId: number;
  status: AttendanceStatus;
}

// Counters shown above the sheet and used to enable the Save button.
export interface AttendanceSheetStats {
  total: number;
  present: number;
  absent: number;
  unmarked: number;
  changes: number;
}

export type AttendanceTab = 'record' | 'summary';


// =====================================================
// Date helpers
// =====================================================

// Locale used to show dates: Arabic month/day names with Latin digits,
// so the numbers match the rest of the system.
export const ATTENDANCE_LOCALE_AR = 'ar-JO-u-nu-latn';
export const ATTENDANCE_LOCALE_EN = 'en-GB';

// Date -> "YYYY-MM-DD" using the LOCAL date parts.
// Do not use toISOString() here: it converts to UTC, so in Amman (UTC+3)
// a date picked at midnight would become the previous day.
export function toApiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// "YYYY-MM-DD" -> local Date (midnight, local time).
export function fromApiDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function todayApiDate(): string {
  return toApiDate(new Date());
}

// "YYYY-MM-DD" -> "الخميس، 08/10/2026" or "Thursday, 08/10/2026".
export function formatAttendanceDate(
  value: string,
  isArabic: boolean
): string {
  return new Intl.DateTimeFormat(
    isArabic ? ATTENDANCE_LOCALE_AR : ATTENDANCE_LOCALE_EN,
    {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }
  ).format(fromApiDate(value));
}
