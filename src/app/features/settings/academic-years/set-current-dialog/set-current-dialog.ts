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

// The term to make current, its year, and the current term / year now
// (null when the school has no current term yet).
export interface SetCurrentDialogData {
  term: AcademicTerm;
  year: AcademicYear;
  currentTerm: AcademicTerm | null;
  currentYear: AcademicYear | null;
}

// "Are you sure?" before changing the current term: it changes the term the
// whole school works in (attendance, subject plans, teacher assignments).
// Closes with true when the user confirms; the page sends the request.
// Same layout as plan-confirm-dialog.
@Component({
  selector: 'app-set-current-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './set-current-dialog.html',
  styleUrl: './set-current-dialog.css',
})
export class SetCurrentDialog {

  readonly data = inject<SetCurrentDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(MatDialogRef<SetCurrentDialog, boolean>);

  private readonly language = inject(Language);

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // "الفصل الثاني · 2026/2027"
  readonly newTermLabel = computed(() =>
    this.label(this.data.term, this.data.year)
  );

  readonly oldTermLabel = computed(() =>
    this.data.currentTerm && this.data.currentYear
      ? this.label(this.data.currentTerm, this.data.currentYear)
      : ''
  );

  // The year changes too when the term belongs to another year.
  readonly yearChanges = computed(() =>
    this.data.year.academicYearId !== this.data.currentYear?.academicYearId
  );

  private label(term: AcademicTerm, year: AcademicYear): string {
    const name = this.isArabic() ? term.nameAr : term.nameEn;

    return `${name} · ${year.yearName}`;
  }

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
