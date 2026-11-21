import { Component, input, output } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { StudentStatus } from '../../../core/models/student';
import { StudentStatusBadge } from '../student-status/student-status';


// One child card, ready to show (the page builds it in the page language).
export interface ChildPickerCard {
  studentId: number;
  name: string;
  initials: string;
  avatarTone: number;

  // The class and section names, in the page language
  // (shown as "الثامن، شعبة ب" with SHARED.CLASS_SECTION).
  classSection: { class: string; section: string };

  status: StudentStatus;
}


// The parent's children as cards: the picked one is highlighted.
// Used by «علامات أبنائي» (/grades) and «حضور أبنائي» (/attendance).
// The page shows it only when the parent has more than one child.
//
// A grid on the computer; one row that scrolls sideways on the phone.
@Component({
  selector: 'app-child-picker',
  imports: [TranslatePipe, StudentStatusBadge],
  templateUrl: './child-picker.html',
  styleUrl: './child-picker.css',
})
export class ChildPicker {

  readonly cards = input.required<ChildPickerCard[]>();

  readonly selectedId = input<number | null>(null);

  // The name of the group for screen readers ("الأبناء").
  readonly label = input.required<string>();

  readonly pick = output<number>();

  readonly statusActive = StudentStatus.Active;
}
