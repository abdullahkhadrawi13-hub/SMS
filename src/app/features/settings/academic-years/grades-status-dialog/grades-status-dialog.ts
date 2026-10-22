import { Component, computed, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { AcademicYear } from '../../../../core/models/academic-year';
import { AcademicTerm } from '../../../../core/models/academic-term';
import { Language } from '../../../../core/services/language';

import { GradesAction } from '../academic-years';

// The term, its year, and whether its grades are being closed or opened.
export interface GradesStatusDialogData {
  term: AcademicTerm;
  year: AcademicYear;
  action: GradesAction;
}

// "Are you sure?" before closing or opening a term's grades.
//
// close: lists what nobody can change after closing (not even the Admin),
//        and that reading stays possible.
// open:  warns that approved grades can change again.
//
// Closes with true when the user confirms; the page sends the request.
// Same layout as set-current-dialog.
@Component({
  selector: 'app-grades-status-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './grades-status-dialog.html',
  styleUrl: './grades-status-dialog.css',
})
export class GradesStatusDialog {

  readonly data = inject<GradesStatusDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(MatDialogRef<GradesStatusDialog, boolean>);

  private readonly language = inject(Language);

  readonly isClosing = this.data.action === 'close';

  // "الفصل الأول · 2026/2027"
  readonly termLabel = computed(() => {
    const name = this.language.currentDirection() === 'rtl'
      ? this.data.term.nameAr
      : this.data.term.nameEn;

    return `${name} · ${this.data.year.yearName}`;
  });

  // What closing the grades stops (translation keys, API Reference section 7).
  readonly blockedKeys = [
    'ACADEMIC_YEARS.GRADES_DIALOG.BLOCKED.MARKS',
    'ACADEMIC_YEARS.GRADES_DIALOG.BLOCKED.ASSESSMENTS',
    'ACADEMIC_YEARS.GRADES_DIALOG.BLOCKED.PLANS',
    'ACADEMIC_YEARS.GRADES_DIALOG.BLOCKED.ASSIGNMENTS',
    'ACADEMIC_YEARS.GRADES_DIALOG.BLOCKED.PLACEMENTS'
  ];

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
