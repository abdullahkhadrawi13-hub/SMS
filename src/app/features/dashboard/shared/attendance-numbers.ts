import { StudentDashboardCard } from '../../../core/models/dashboard';
import { NumbersStripItem } from '../../../shared/components/numbers-strip/numbers-strip';
import { pluralKey } from '../../../shared/utils/plural';
import { formatLastAbsence, getAttendanceCounts } from '../../../shared/utils/attendance-counts';
import { toApiDate } from '../../settings/academic-years/academic-years';


// The current term's attendance as three numbers (the Student dashboard strip
// and each child's card): days present, days absent, and the attendance rate.
// The counts are the same as on the attendance pages
// (shared/utils/attendance-counts.ts); only recorded days count.
export function attendanceNumbers(
  card: StudentDashboardCard,
  isArabic: boolean,
  withLastAbsence: boolean
): NumbersStripItem[] {

  const counts = getAttendanceCounts(card.attendance, card.attendance?.lastAbsenceDate ?? null);

  return [
    {
      labelKey: 'ATTENDANCE_COUNTS.PRESENT',
      value: counts.present,
      captionKey: pluralKey('DASHBOARD.ATTENDANCE_NUMBERS.OF_DAYS', counts.recorded),
      captionParams: { count: counts.recorded },
    },
    {
      labelKey: 'ATTENDANCE_COUNTS.ABSENT',
      value: counts.absent,
      isBad: counts.absent > 0,
      ...(counts.absent === 0
        ? { captionKey: 'ATTENDANCE_COUNTS.NO_ABSENCE' }
        : withLastAbsence && counts.lastAbsence
          ? {
              captionKey: 'ATTENDANCE_COUNTS.LAST_ABSENCE',
              captionParams: { date: formatLastAbsence(counts.lastAbsence, isArabic) },
            }
          : { captionKey: 'DASHBOARD.ATTENDANCE_NUMBERS.THIS_TERM' }),
    },
    counts.rate === null
      ? {
          labelKey: 'ATTENDANCE_COUNTS.RATE',
          value: 0,
          valueText: '—',
          isEmpty: true,
          captionKey: 'DASHBOARD.ATTENDANCE_NUMBERS.NONE_YET',
        }
      : {
          labelKey: 'ATTENDANCE_COUNTS.RATE',
          value: counts.rate,
          valueText: `${counts.rate}%`,
          captionKey: 'DASHBOARD.ATTENDANCE_NUMBERS.THIS_TERM',
        },
  ];
}


// The child's last absence is today (the browser's local date):
// "غياب اليوم" on the child's card and in "يحتاج انتباهك".
export function isAbsentToday(card: StudentDashboardCard): boolean {
  return card.attendance?.lastAbsenceDate === toApiDate(new Date());
}
