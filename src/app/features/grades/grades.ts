import {
  GradeSheetAssessment,
  GradeSheetComponent,
  GradeSheetMark,
  GradeSheetStudent,
} from '../../core/models/student-grade';

// The models sent to / received from the API are in core/models/student-grade.ts.
// This file keeps only what the grades screens use.


// =====================================================
// Selection
// =====================================================

// How the page chooses the section and subject:
// - teacher: one field, the teacher's own subjects in the current term
//   (GET /api/teacherassignments/mine)
// - staff:   Admin and Assistant Principal, term → class → section → subject
//   (GET /api/teacherassignments?academicTermId=)
export type GradesSelectorMode = 'teacher' | 'staff';


// One choice in the subject field (one teacher assignment).
//   teacher: "Mathematics · Grade 1 / A"
//   staff:   "Mathematics", with the teacher's name under the field
export interface GradesAssignmentOption {
  teacherAssignmentId: number;
  label: string;
  teacherName: string;
}


// =====================================================
// Sheet
// =====================================================

// The marks typed on the screen and not saved yet.
// Key: markKey(studentId, assessmentId). Value: the text as typed.
// A cell is in the draft only while its text differs from the saved mark.
export type GradesDraft = Record<string, string>;

export function markKey(studentId: number, assessmentId: number): string {
  return `${studentId}-${assessmentId}`;
}


// One group of columns: a plan component and its assessments.
// An open component with no assessment yet has no columns
// (the sheet shows one "No assessment yet" column instead).
export interface SheetColumnGroup {
  component: GradeSheetComponent;
  name: string;
  color: string;
  assessments: SheetColumn[];
}

export interface SheetColumn {
  assessment: GradeSheetAssessment;
  name: string;
}


// One student row, with the saved marks by assessmentId.
// savedCells: the whole saved cell (studentGradeId, mark, isEdited),
// used by the history button.
export interface SheetRow {
  student: GradeSheetStudent;
  name: string;
  savedMarks: Map<number, number | null>;
  savedCells: Map<number, GradeSheetMark>;
}


// =====================================================
// A mark's history
// =====================================================

// What the history panel needs to know about the cell that opened it.
// The history itself is loaded when the panel opens.
export interface GradeHistoryTarget {
  studentGradeId: number;

  // Shown at the top of the panel: "Sara Al-Khatib · Quiz 1 (out of 10)".
  studentName: string;
  assessmentName: string;
  maxMark: string;
}


// The counters above the sheet (from the saved results of the backend).
export interface GradesSheetCounts {
  total: number;
  passed: number;
  failed: number;
  incomplete: number;
}


// The changes on the screen (save bar).
export interface GradesDraftStats {
  changes: number;
  invalid: number;
}


// Emitted by the sheet when the user types in a cell.
export interface MarkChange {
  studentId: number;
  assessmentId: number;
  text: string;
}


// The state of one cell:
// - saved:   same as the saved mark (or empty with no saved mark)
// - changed: a valid new mark, not saved yet
// - invalid: not a number, below 0, above the max mark, more than
//            2 decimals, or a saved mark that was cleared (a saved mark
//            cannot be removed from the sheet, only changed)
export type MarkCellState = 'saved' | 'changed' | 'invalid';

// Why a cell is invalid (shown as the cell's tooltip).
export type MarkError = 'range' | 'clear';


// =====================================================
// Mark text helpers
// =====================================================

// Arabic-Indic digits and the Arabic decimal separator, so a mark typed
// on an Arabic keyboard (٨٫٥) is read as 8.5.
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeMarkText(text: string): string {

  return text
    .trim()
    .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[٫,]/g, '.');
}


// A mark between 0 and maxMark with at most 2 decimals
// (the backend stores decimal(5,2)).
const MARK_PATTERN = /^\d+(\.\d{1,2})?$/;

// The number of a typed mark: null when empty, NaN when not allowed.
export function parseMark(text: string, maxMark: number): number | null {

  const normalized = normalizeMarkText(text);

  if (normalized === '') {
    return null;
  }

  if (!MARK_PATTERN.test(normalized)) {
    return NaN;
  }

  const value = Number(normalized);

  return value >= 0 && value <= maxMark ? value : NaN;
}


// true when the typed text means the same as the saved mark
// ("8", "8.0" and "٨" are all the same as 8; "" is the same as no mark).
export function isSameAsSaved(text: string, saved: number | null): boolean {

  const normalized = normalizeMarkText(text);

  if (normalized === '') {
    return saved === null;
  }

  return saved !== null
    && MARK_PATTERN.test(normalized)
    && Number(normalized) === Number(saved);
}


// The error of a typed mark, or null when it can be saved.
export function getMarkError(
  text: string,
  saved: number | null,
  maxMark: number
): MarkError | null {

  const value = parseMark(text, maxMark);

  if (value === null) {
    return saved === null ? null : 'clear';
  }

  return Number.isNaN(value) ? 'range' : null;
}
