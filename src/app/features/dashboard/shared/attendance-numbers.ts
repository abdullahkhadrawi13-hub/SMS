import { StudentDashboardCard } from '../../../core/models/dashboard';
import { pluralKey } from '../../../shared/utils/plural';
import { formatLongDate, toApiDate } from '../../settings/academic-years/academic-years';

import { DashboardNumber } from './dashboard.models';


// The current term's attendance as three numbers (the Student dashboard strip
// and each child's card): days present, days absent, and the attendance rate.
// Only recorded days count (totalRecorded = present + absent).
export function attendanceNumbers(
  card: StudentDashboardCard,
  isArabic: boolean,
  withLastAbsence: boolean
): DashboardNumber[] {

  const attendance = card.attendance ?? { presentCount: 0, absentCount: 0, totalRecorded: 0, lastAbsenceDate: null };
  const total = attendance.totalRecorded;
  const rate = total > 0 ? Math.round((attendance.presentCount / total) * 100) : null;
  const last = attendance.lastAbsenceDate;

  return [
    {
      labelKey: 'DASHBOARD.ATTENDANCE_NUMBERS.PRESENT',
      value: attendance.presentCount,
      captionKey: pluralKey('DASHBOARD.ATTENDANCE_NUMBERS.OF_DAYS', total),
      captionParams: { count: total },
    },
    {
      labelKey: 'DASHBOARD.ATTENDANCE_NUMBERS.ABSENT',
      value: attendance.absentCount,
      isBad: attendance.absentCount > 0,
      ...(attendance.absentCount === 0
        ? { captionKey: 'DASHBOARD.ATTENDANCE_NUMBERS.ABSENT_NONE' }
        : withLastAbsence && last
          ? { captionKey: 'DASHBOARD.ATTENDANCE_NUMBERS.ABSENT_LAST', captionParams: { date: formatLongDate(last, isArabic) } }
          : { captionKey: 'DASHBOARD.ATTENDANCE_NUMBERS.THIS_TERM' }),
    },
    {
      labelKey: 'DASHBOARD.ATTENDANCE_NUMBERS.RATE',
      value: rate ?? 0,
      valueText: rate === null ? '—' : `${rate}%`,
      captionKey: rate === null ? 'DASHBOARD.ATTENDANCE_NUMBERS.NONE_YET' : 'DASHBOARD.ATTENDANCE_NUMBERS.THIS_TERM',
    },
  ];
}


// The child's last absence is today (the browser's local date):
// "غياب اليوم" on the child's card and in "يحتاج انتباهك".
export function isAbsentToday(card: StudentDashboardCard): boolean {
  return card.attendance?.lastAbsenceDate === toApiDate(new Date());
}
