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
import { StatusBadgeTone } from '../../../../shared/components/status-badge/status-badge';
import { pluralKey } from '../../../../shared/utils/plural';

import { avatarTone, nameInitials } from '../rollover';


// One number of the result: the label with its dot, the number,
// one short line under it.
interface ResultTile {
  labelKey: string;
  textKey: string;
  count: number;
  tone: StatusBadgeTone;
}


// After POST /api/rollover: the counts per outcome, and the students
// that could not be placed with the reason.
// Navy & gold (15 Nov 2026): a white card with a green "done" icon and
// the numbers divided by lines; the students not placed in the shared
// table look (a two-line list on the phone).
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

  // Under 720px the students not placed show as a two-line list.
  readonly isPhone = input(false);

  // Load the preview again (everyone moved comes back as "Already placed").
  readonly newPreview = output<void>();

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Only the outcomes that happened (a 0 tile says nothing).
  readonly tiles = computed<ResultTile[]>(() => {
    const result = this.result();

    const tiles: ResultTile[] = [
      { labelKey: 'ROLLOVER.RESULT.COPIED',         textKey: 'ROLLOVER.CONFIRM.COPY_TEXT',           count: result.copied,        tone: 'ok' },
      { labelKey: 'ROLLOVER.RESULT.PROMOTED',       textKey: 'ROLLOVER.CONFIRM.PROMOTE_TEXT',        count: result.promoted,      tone: 'ok' },
      { labelKey: 'ROLLOVER.RESULT.REPEATED',       textKey: 'ROLLOVER.CONFIRM.REPEAT_TEXT',         count: result.repeated,      tone: 'bad' },
      { labelKey: 'ROLLOVER.RESULT.GRADUATED',      textKey: 'ROLLOVER.CONFIRM.GRADUATE_TEXT',       count: result.graduated,     tone: 'gold' },
      { labelKey: 'ROLLOVER.RESULT.ALREADY_PLACED', textKey: 'ROLLOVER.CONFIRM.ALREADY_PLACED_TEXT', count: result.alreadyPlaced, tone: 'neutral' }
    ];

    return tiles.filter(tile => tile.count > 0);
  });

  // "1 student" / "2 students" … next to the title.
  readonly notPlacedKey = computed(() =>
    pluralKey('ROLLOVER.RESULT.STUDENTS', this.result().notPlaced.length)
  );

  avatarTone(student: RolloverStudent): number {
    return avatarTone(student.studentId);
  }

  initials(student: RolloverStudent): string {
    return nameInitials(this.studentName(student));
  }

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
