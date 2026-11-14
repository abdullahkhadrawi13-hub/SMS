import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Language } from '../../../../core/services/language';
import { fromApiDateTime } from '../../../../shared/utils/date-time';
import { pluralKey } from '../../../../shared/utils/plural';

import { DashboardMapSection, TodayAttendance } from '../dashboard.models';


// One square of the sections map, ready for the template.
interface MapCell {
  id: number;
  letter: string;
  state: DashboardMapSection['state'];
  captionKey: string;
  captionParams: Record<string, number>;
  ariaClass: string;
}

interface MapRow {
  id: number;
  className: string;
  cells: MapCell[];
}


// "حضور اليوم" on the Admin and AssistantPrincipal dashboards:
// how many sections finished today's sheet, the absentees and the rate,
// then a map with one square per section (complete / partial / not started).
// Spec: "SMS — مواصفات تصميم الكحلي والذهبي" → خريطة الشعب في لوحة التحكم.
//
// For now the buttons and the squares have no action:
// they get their links when the dashboard is connected to the backend.
@Component({
  selector: 'app-today-attendance-card',
  imports: [
    TranslatePipe,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './today-attendance-card.html',
  styleUrl: './today-attendance-card.css',
})
export class TodayAttendanceCard {

  private readonly language = inject(Language);

  readonly data = input.required<TodayAttendance>();

  readonly pluralKey = pluralKey;

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // "9:42 ص" / "9:42 AM", in the browser's local time.
  readonly updatedTime = computed(() =>
    new Intl.DateTimeFormat(this.isArabic() ? 'ar-JO-u-nu-latn' : 'en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(fromApiDateTime(this.data().updatedAt))
  );

  // The share of sections that finished, for the gold progress bar (0–100).
  readonly completePercent = computed(() => {
    const { sectionsComplete, sectionsTotal } = this.data();
    return sectionsTotal > 0 ? Math.round((sectionsComplete / sectionsTotal) * 100) : 0;
  });

  // "94.4%" of the students who have a status; null when nobody is recorded yet.
  readonly attendanceRate = computed(() => {
    const { presentCount, recordedCount } = this.data();

    if (recordedCount === 0) {
      return null;
    }

    return `${Math.round((presentCount / recordedCount) * 1000) / 10}%`;
  });

  // The map fills its two columns top to bottom (the first classes on the
  // start side, the rest on the end side), so it needs the number of lines.
  readonly mapLines = computed(() =>
    Math.max(1, Math.ceil(this.data().classes.length / 2))
  );

  readonly rows = computed<MapRow[]>(() => {
    const isArabic = this.isArabic();

    return this.data().classes.map(cls => {
      const className = isArabic ? cls.nameAr : cls.nameEn;

      return {
        id: cls.classId,
        className,
        cells: cls.sections.map(section => {
          const letter = isArabic ? section.nameAr : section.nameEn;

          return {
            id: section.sectionId,
            letter,
            state: section.state,
            ...this.caption(section),
            ariaClass: `${className} ${letter}`,
          };
        }),
      };
    });
  });

  // The small line in a square: "غياب 2", "بلا غياب", "15 من 19", "لم تبدأ".
  private caption(section: DashboardMapSection): Pick<MapCell, 'captionKey' | 'captionParams'> {

    if (section.state === 'notStarted') {
      return { captionKey: 'DASHBOARD.TODAY.CELL.NOT_STARTED', captionParams: {} };
    }

    if (section.state === 'partial') {
      return {
        captionKey: 'DASHBOARD.TODAY.CELL.PARTIAL',
        captionParams: { recorded: section.recordedCount, total: section.studentCount },
      };
    }

    if (section.absentCount === 0) {
      return { captionKey: 'DASHBOARD.TODAY.CELL.NONE_ABSENT', captionParams: {} };
    }

    return {
      captionKey: 'DASHBOARD.TODAY.CELL.ABSENT',
      captionParams: { count: section.absentCount },
    };
  }
}
