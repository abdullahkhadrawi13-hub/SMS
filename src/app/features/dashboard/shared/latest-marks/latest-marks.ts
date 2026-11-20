import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { DashboardLatestMark } from '../../../../core/models/dashboard';
import { fromApiDateTime } from '../../../../shared/utils/date-time';
import { getDateLocale } from '../../../settings/academic-years/academic-years';


// One line, ready for the template.
interface MarkLine {
  id: number;
  subject: string;
  assessment: string;
  date: string;        // "18 تشرين الثاني"
  mark: string;        // "17.5"
  maxMark: string;     // "20"
  isLow: boolean;      // under half of the max mark
  isEdited: boolean;
}


// The newest marks of the current term (GET /api/dashboard/.../me → latestMarks):
// the subject and the assessment, the day it was saved, and the mark out of
// its max. A mark under half of its max is shown in red.
// Used inside a card: the Student dashboard card and each child's card.
@Component({
  selector: 'app-latest-marks',
  imports: [TranslatePipe],
  templateUrl: './latest-marks.html',
  styleUrl: './latest-marks.css',
})
export class LatestMarks {

  private readonly language = inject(Language);

  readonly marks = input.required<DashboardLatestMark[]>();

  // At most this many lines (the API sends up to 5).
  readonly limit = input(5);

  readonly lines = computed<MarkLine[]>(() => {
    const isArabic = this.language.currentDirection() === 'rtl';
    const format = new Intl.DateTimeFormat(getDateLocale(isArabic), { day: 'numeric', month: 'long' });
    const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

    return this.marks().slice(0, this.limit()).map((mark, index) => ({
      id: index,
      subject: isArabic ? mark.subjectAr : mark.subjectEn,
      assessment: isArabic ? mark.assessmentNameAr : mark.assessmentNameEn,
      date: format.format(fromApiDateTime(mark.savedAt)),
      mark: number.format(mark.mark),
      maxMark: number.format(mark.maxMark),
      isLow: mark.mark < mark.maxMark / 2,
      isEdited: mark.isEdited,
    }));
  });
}
