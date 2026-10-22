import { Component, inject } from '@angular/core';

import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';

import { GradeHistoryTarget } from '../grades';
import { GradeHistory } from '../grade-history/grade-history';


// A mark's history on a narrow screen (650px or less): it slides up from the
// bottom of the screen, which is easier to tap than a small menu.
// Opened by the grade sheet with MatBottomSheet; the content is the same
// GradeHistory used in the menu on wide screens.
// Closes with the close button, a tap outside it, or Escape.
@Component({
  selector: 'app-grade-history-sheet',
  imports: [
    GradeHistory,
  ],
  templateUrl: './grade-history-sheet.html',
  styleUrl: './grade-history-sheet.css',
})
export class GradeHistorySheet {

  readonly target = inject<GradeHistoryTarget>(MAT_BOTTOM_SHEET_DATA);

  private readonly sheetRef = inject(MatBottomSheetRef<GradeHistorySheet>);


  close(): void {
    this.sheetRef.dismiss();
  }
}
