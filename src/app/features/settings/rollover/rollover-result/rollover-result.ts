import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import {
  RolloverResult as RolloverResultData,
  RolloverStudent
} from '../../../../core/models/rollover';
import { Language } from '../../../../core/services/language';


// One tile of the result.
interface ResultTile {
  labelKey: string;
  count: number;
  tone: string;
}


// After POST /api/rollover: the counts per outcome, and the students
// that could not be placed with the reason.
@Component({
  selector: 'app-rollover-result',
  imports: [
    RouterLink,

    MatButtonModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './rollover-result.html',
  styleUrl: './rollover-result.css',
})
export class RolloverResult {

  private readonly language = inject(Language);

  readonly result = input.required<RolloverResultData>();
  readonly isNewYear = input(false);

  // "First Term · 2026/2027"
  readonly toTermName = input('');

  // The old year (its grades are now closed for good). null in the same year.
  readonly fromYearName = input<string | null>(null);

  // Load the preview again (everyone moved comes back as "Already placed").
  readonly newPreview = output<void>();

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Only the outcomes that happened (a 0 tile says nothing).
  readonly tiles = computed<ResultTile[]>(() => {
    const result = this.result();

    const tiles: ResultTile[] = [
      { labelKey: 'ROLLOVER.RESULT.COPIED',         count: result.copied,        tone: 'blue' },
      { labelKey: 'ROLLOVER.RESULT.PROMOTED',       count: result.promoted,      tone: 'green' },
      { labelKey: 'ROLLOVER.RESULT.REPEATED',       count: result.repeated,      tone: 'orange' },
      { labelKey: 'ROLLOVER.RESULT.GRADUATED',      count: result.graduated,     tone: 'gold' },
      { labelKey: 'ROLLOVER.RESULT.ALREADY_PLACED', count: result.alreadyPlaced, tone: 'grey' }
    ];

    return tiles.filter(tile => tile.count > 0);
  });

  studentName(student: RolloverStudent): string {
    return this.isArabic()
      ? student.studentNameAr || student.studentNameEn
      : student.studentNameEn || student.studentNameAr;
  }

  fromPlace(student: RolloverStudent): string {
    return this.isArabic()
      ? `${student.fromClassNameAr} · ${student.fromSectionAr}`
      : `${student.fromClassNameEn} · ${student.fromSectionEn}`;
  }

  note(student: RolloverStudent): string {
    return this.isArabic()
      ? student.noteAr || student.noteEn
      : student.noteEn || student.noteAr;
  }
}
