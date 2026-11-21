import { catchError, map, Observable, of } from 'rxjs';

import {
  ATTENDANCE_ABSENT,
  AttendanceRecord,
  AttendanceTermSummary,
} from '../../../core/models/attendance';
import { DashboardCurrentTerm } from '../../../core/models/dashboard';
import { DEFAULT_WEEKLY_DAYS_OFF } from '../../../core/models/school-settings';
import { StudentStatus } from '../../../core/models/student';
import { SchoolSettingsService } from '../../../core/services/school-settings';
import {
  ATTENDANCE_LOCALE_AR,
  ATTENDANCE_LOCALE_EN,
  fromApiDate,
  toApiDate,
} from '../shared/attendance-shared';


// Shared helpers of one student's attendance (read only).
// Used by three screens:
//   - «حضوري»          (the student, /attendance)
//   - «حضور أبنائي»    (the parent, /attendance)
//   - the "Attendance" tab of the student page (Admin, AssistantPrincipal)
//
// The screens get every record of the student (every term) and the
// per-term counts (summary), and show ONE term at a time: the numbers,
// a month calendar and the list of days absent.


// =====================================================
// The school's weekly days off
// =====================================================

// GET /api/schoolsettings/school (every signed-in user).
// Only the days off are needed. If the request fails, the backend's
// default (Friday and Saturday) is used: the calendar still works,
// so this is never shown as an error.
export function loadWeeklyDaysOff(
  service: SchoolSettingsService
): Observable<readonly number[]> {

  return service.getSchoolInfo().pipe(
    map(response =>
      response.success && response.data
        ? response.data.weeklyDaysOff
        : DEFAULT_WEEKLY_DAYS_OFF
    ),
    catchError(() => of(DEFAULT_WEEKLY_DAYS_OFF))
  );
}


// =====================================================
// Terms
// =====================================================

// One term of the "Academic term" list in the header.
export interface AttendanceTermOption {
  academicTermId: number;
  termNameAr: string;
  termNameEn: string;
  yearName: string;
  isCurrent: boolean;
}

// The terms to choose from, newest first: the terms of the summary
// (the terms that have records), plus the current term when it has no
// record yet (the summary leaves it out at the start of a term).
// currentTerm comes from the dashboard endpoint (student and parent);
// the staff tab has none.
export function getTermOptions(
  summaryTerms: AttendanceTermSummary[],
  currentTerm: DashboardCurrentTerm | null
): AttendanceTermOption[] {

  const options: AttendanceTermOption[] = summaryTerms.map(term => ({
    academicTermId: term.academicTermId,
    termNameAr: term.termNameAr,
    termNameEn: term.termNameEn,
    yearName: term.yearName,
    isCurrent: term.isCurrent,
  }));

  if (
    currentTerm &&
    !options.some(o => o.academicTermId === currentTerm.academicTermId)
  ) {
    options.unshift({ ...currentTerm, isCurrent: true });
  }

  // Mark the current term (the summary may not, when it came from the dashboard).
  return options.map(option => ({
    ...option,
    isCurrent:
      option.isCurrent ||
      option.academicTermId === currentTerm?.academicTermId,
  }));
}

// The term shown first: the current one, else the newest with records.
export function getDefaultTermId(options: AttendanceTermOption[]): number | null {
  return (options.find(o => o.isCurrent) ?? options[0])?.academicTermId ?? null;
}

// "الفصل الأول، 2026/2027" (STUDENT_ATTENDANCE.TERM_LABEL).
export function getTermLabelParams(
  term: Pick<AttendanceTermOption, 'termNameAr' | 'termNameEn' | 'yearName'>,
  isArabic: boolean
): { term: string; year: string } {

  return {
    term: isArabic
      ? term.termNameAr || term.termNameEn
      : term.termNameEn || term.termNameAr,
    year: term.yearName,
  };
}


// =====================================================
// Counts of one term
// =====================================================

export interface AttendanceCounts {
  present: number;
  absent: number;
  recorded: number;

  // Present ÷ recorded, as a whole percentage. null = no recorded day.
  rate: number | null;

  // The newest day absent ("YYYY-MM-DD"), or null.
  lastAbsence: string | null;
}

// The counts come from the summary (the backend's numbers).
// lastAbsence comes from the records (the summary does not have it).
// A term that is not in the summary has no records: zeros.
export function getCounts(
  summary: AttendanceTermSummary | null,
  termRecords: AttendanceRecord[]
): AttendanceCounts {

  const present = summary?.presentCount ?? 0;
  const absent = summary?.absentCount ?? 0;
  const recorded = summary?.totalRecorded ?? 0;

  const absences = termRecords.filter(r => r.status === ATTENDANCE_ABSENT);

  return {
    present,
    absent,
    recorded,
    rate: recorded > 0 ? Math.round((present / recorded) * 100) : null,
    lastAbsence: absences.length > 0 ? absences[absences.length - 1].date : null,
  };
}


// =====================================================
// The month calendar
// =====================================================

// What one day of the calendar shows:
//   present / absent  a record
//   unrecorded        a school day inside the term's recorded range, today
//                     or earlier, with no record: NOT present, NOT absent
//   off               a weekly day off (weeklyDaysOff), with no record
//   none              before the first record or after the last day shown
//                     (the future, or after a past term): no mark
export type CalendarDayKind = 'present' | 'absent' | 'unrecorded' | 'off' | 'none';

export interface CalendarDay {
  date: string;          // "YYYY-MM-DD"
  day: number;           // 1..31
  kind: CalendarDayKind;
  isToday: boolean;
  record: AttendanceRecord | null;
}

// [year, month] (month 0..11, like Date.getMonth()).
export type CalendarMonth = readonly [number, number];

// The days the calendar covers for one term:
//   from: the first record of the term (or today when it has none)
//   to:   today for the current term, the last record for a past term.
// The term's real start and end dates are not readable by the student
// and the parent (GET /api/academicterms is staff only), so the records
// decide the range.
export function getCalendarRange(
  termRecords: AttendanceRecord[],
  isCurrentTerm: boolean,
  today: string
): { from: string; to: string } {

  if (termRecords.length === 0) {
    return { from: today, to: today };
  }

  const first = termRecords[0].date;
  const last = termRecords[termRecords.length - 1].date;

  return {
    from: first,
    to: isCurrentTerm && today > last ? today : last,
  };
}

// Every month between two dates, oldest first.
export function getMonths(from: string, to: string): CalendarMonth[] {

  const start = fromApiDate(from);
  const end = fromApiDate(to);

  const months: CalendarMonth[] = [];

  let year = start.getFullYear();
  let month = start.getMonth();

  while (
    year < end.getFullYear() ||
    (year === end.getFullYear() && month <= end.getMonth())
  ) {
    months.push([year, month]);

    month++;

    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return months;
}

export function getMonthOf(date: string): CalendarMonth {
  const d = fromApiDate(date);
  return [d.getFullYear(), d.getMonth()];
}

export function isSameMonth(a: CalendarMonth | null, b: CalendarMonth | null): boolean {
  return !!a && !!b && a[0] === b[0] && a[1] === b[1];
}

// The weeks of one month, Sunday first. null = a cell outside the month.
export function buildMonthWeeks(
  month: CalendarMonth,
  recordsByDate: ReadonlyMap<string, AttendanceRecord>,
  weeklyDaysOff: readonly number[],
  range: { from: string; to: string },
  today: string
): (CalendarDay | null)[][] {

  const [year, monthIndex] = month;

  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (CalendarDay | null)[] = [];

  // Empty cells before the 1st (Sunday = 0).
  for (let i = 0; i < first.getDay(); i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {

    const value = new Date(year, monthIndex, day);
    const date = toApiDate(value);
    const record = recordsByDate.get(date) ?? null;

    let kind: CalendarDayKind;

    if (record) {
      kind = record.status === ATTENDANCE_ABSENT ? 'absent' : 'present';
    } else if (weeklyDaysOff.includes(value.getDay())) {
      kind = 'off';
    } else if (date >= range.from && date <= range.to) {
      kind = 'unrecorded';
    } else {
      kind = 'none';
    }

    cells.push({ date, day, kind, isToday: date === today, record });
  }

  // Empty cells after the last day, to close the last week.
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (CalendarDay | null)[][] = [];

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}


// =====================================================
// Formatting
// =====================================================

function locale(isArabic: boolean): string {
  return isArabic ? ATTENDANCE_LOCALE_AR : ATTENDANCE_LOCALE_EN;
}

// "تشرين الثاني 2026" / "November 2026"
export function formatMonth(month: CalendarMonth, isArabic: boolean): string {
  return new Intl.DateTimeFormat(locale(isArabic), {
    month: 'long',
    year: 'numeric',
  }).format(new Date(month[0], month[1], 1));
}

// "الخميس، 12 تشرين الثاني 2026" / "Thursday, 12 November 2026"
export function formatLongDate(date: string, isArabic: boolean): string {
  return new Intl.DateTimeFormat(locale(isArabic), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromApiDate(date));
}

// "الخميس، 12 تشرين الثاني" / "Thursday 12 November" (no year)
export function formatShortDate(date: string, isArabic: boolean): string {
  return new Intl.DateTimeFormat(locale(isArabic), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(fromApiDate(date));
}

// The weekday names, Sunday first: long ("الأحد") and narrow ("ح").
// 1 November 2026 is a Sunday.
export function getWeekdayNames(isArabic: boolean): { long: string; short: string }[] {

  const long = new Intl.DateTimeFormat(locale(isArabic), { weekday: 'long' });
  const short = new Intl.DateTimeFormat(locale(isArabic), { weekday: 'narrow' });

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(2026, 10, 1 + i);
    return { long: long.format(day), short: short.format(day) };
  });
}


// =====================================================
// A child who is not active (parent's page)
// =====================================================

// A child whose status (in the Students table) is not Active has no
// record in the current term. The page shows this message, with a link
// to the earlier terms.
const CHILD_STATUS_KEYS: Record<StudentStatus, string> = {
  [StudentStatus.Active]: '',
  [StudentStatus.Inactive]: 'STUDENT_ATTENDANCE.CHILDREN.INACTIVE',
  [StudentStatus.Graduated]: 'STUDENT_ATTENDANCE.CHILDREN.GRADUATED',
  [StudentStatus.Transferred]: 'STUDENT_ATTENDANCE.CHILDREN.TRANSFERRED',
};

const CHILD_STATUS_ICONS: Record<StudentStatus, string> = {
  [StudentStatus.Active]: 'school',
  [StudentStatus.Inactive]: 'person_off',
  [StudentStatus.Graduated]: 'workspace_premium',
  [StudentStatus.Transferred]: 'swap_horiz',
};

export function getChildStatusMessage(status: StudentStatus): { icon: string; key: string } {
  return {
    icon: CHILD_STATUS_ICONS[status],
    key: CHILD_STATUS_KEYS[status],
  };
}
