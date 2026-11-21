import { NumbersStripItem } from '../../../shared/components/numbers-strip/numbers-strip';
import { pluralKey } from '../../../shared/utils/plural';

import { DashboardStats } from './dashboard.models';


// The numbers strip of the Admin and AssistantPrincipal dashboards:
// active students (in how many sections), teachers, linked parents,
// and classes ("الأول إلى العاشر").
export function adminNumbers(stats: DashboardStats, isArabic: boolean): NumbersStripItem[] {

  const { firstClass, lastClass } = stats;

  return [
    {
      labelKey: 'DASHBOARD.STATS.STUDENTS',
      value: stats.activeStudents,
      captionKey: pluralKey('DASHBOARD.STATS.IN_SECTIONS', stats.activeSections),
      captionParams: { count: stats.activeSections },
    },
    {
      labelKey: 'DASHBOARD.STATS.TEACHERS',
      value: stats.activeTeachers,
      captionKey: 'DASHBOARD.STATS.TEACHERS_CAPTION',
    },
    {
      labelKey: 'DASHBOARD.STATS.PARENTS',
      value: stats.linkedParents,
      captionKey: 'DASHBOARD.STATS.PARENTS_CAPTION',
    },
    {
      labelKey: 'DASHBOARD.STATS.CLASSES',
      value: stats.activeClasses,
      // No caption when there are no classes
      ...(firstClass && lastClass
        ? {
            captionKey: 'DASHBOARD.STATS.CLASSES_CAPTION',
            captionParams: {
              first: isArabic ? firstClass.nameAr : firstClass.nameEn,
              last: isArabic ? lastClass.nameAr : lastClass.nameEn,
            },
          }
        : {}),
    },
  ];
}
