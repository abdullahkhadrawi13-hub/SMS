// One student's attendance in one term, as numbers.
// One place for the whole app:
//   - the Student dashboard and each child's card on the Parent dashboard
//     (from GET /api/dashboard/student|parent/me → attendance)
//   - «حضوري», «حضور أبنائي» and the "Attendance" tab of the student page
//     (from GET /api/attendance/summary/… → one term)
//
// Only recorded days count (recorded = present + absent): a day with no
// record is neither present nor absent.


// The backend's counts of one term. Both responses have these three fields.
export interface AttendanceTotals {
  presentCount: number;
  absentCount: number;
  totalRecorded: number;
}

export interface AttendanceCounts {
  present: number;
  absent: number;
  recorded: number;

  // Present ÷ recorded, as a whole percentage. null = no recorded day yet.
  rate: number | null;

  // The newest day absent (date only: "2026-11-12"), or null.
  lastAbsence: string | null;
}


// No totals (no record in that term) = zeros.
export function getAttendanceCounts(
  totals: AttendanceTotals | null,
  lastAbsence: string | null
): AttendanceCounts {

  const present = totals?.presentCount ?? 0;
  const absent = totals?.absentCount ?? 0;
  const recorded = totals?.totalRecorded ?? 0;

  return {
    present,
    absent,
    recorded,
    rate: recorded > 0 ? Math.round((present / recorded) * 100) : null,
    lastAbsence: absent > 0 ? lastAbsence : null,
  };
}


// The day of the last absence, without the year (it is always this term):
// "الخميس، 12 تشرين الثاني" / "Thursday 12 November".
// Arabic month names with Latin digits, like the rest of the system.
export function formatLastAbsence(date: string, isArabic: boolean): string {

  // A date only ("2026-11-12"): read as a local day, not as UTC midnight.
  const [year, month, day] = date.split('-').map(Number);

  return new Intl.DateTimeFormat(isArabic ? 'ar-JO-u-nu-latn' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, day));
}
