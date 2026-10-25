import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../../core/services/api-message';
import { SubjectPlansService } from '../../../../core/services/subject-plans';
import { ActionResult } from '../../../../shared/services/action-result';
import { CopySubjectPlansResult } from '../../../../core/models/subject-plan';

import { getTermLabel, TermOption } from '../../shared/subjects-shared';


// Data passed by the plans tab.
export interface CopyPlansData {
  // Every term, newest first.
  terms: TermOption[];

  // The term selected in the tab: the plans are copied into it.
  toTermId: number;
}


// "Copy from an earlier term" (POST /api/subjectplans/copy).
// Copies every plan of one term into the selected term, for every class
// (components and passing mark, unlocked). A plan that already exists in the
// target term, or one for an inactive class or subject, is skipped.
// After copying, the dialog shows the counts; it closes with the result
// so the tab reloads its cards.
@Component({
  selector: 'app-copy-plans-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './copy-plans-dialog.html',
  styleUrl: './copy-plans-dialog.css',
})
export class CopyPlansDialog {

  private readonly dialogRef =
    inject(MatDialogRef<CopyPlansDialog, CopySubjectPlansResult>);

  private readonly plansService = inject(SubjectPlansService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<CopyPlansData>(MAT_DIALOG_DATA);


  // The target term (read-only).
  readonly toTerm = this.data.terms.find(t => t.academicTermId === this.data.toTermId);

  // Every other term can be the source.
  readonly fromTerms = this.data.terms.filter(t => t.academicTermId !== this.data.toTermId);

  // The source starts on the term just before the target (by start date).
  readonly fromTermId = new FormControl<number | null>(
    this.defaultFromTermId(),
    [Validators.required]
  );

  readonly isSubmitting = signal(false);

  // Set after a successful copy: the dialog then shows the counts.
  readonly result = signal<CopySubjectPlansResult | null>(null);


  isArabic(): boolean {
    return document.documentElement.lang === 'ar';
  }

  termLabel(term: TermOption | undefined): string {
    return term ? getTermLabel(term, this.isArabic()) : '';
  }


  // The newest term that starts before the target term.
  private defaultFromTermId(): number | null {

    const target = this.toTerm;

    if (!target) {
      return null;
    }

    const earlier = this.fromTerms.find(t => t.startDate < target.startDate);

    return earlier?.academicTermId ?? null;
  }


  copy(): void {

    if (this.fromTermId.invalid) {
      this.fromTermId.markAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    this.plansService
      .copyPlans({
        fromAcademicTermId: this.fromTermId.value as number,
        toAcademicTermId: this.data.toTermId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.result.set(response.data);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to copy subject plans:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  close(): void {
    this.dialogRef.close(this.result() ?? undefined);
  }
}
