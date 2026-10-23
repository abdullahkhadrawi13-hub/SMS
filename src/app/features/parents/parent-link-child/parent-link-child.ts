import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ParentsService } from '../../../core/services/parents';
import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';
import { ParentDto, ParentRelationship } from '../../../core/models/parent';
import { Student } from '../../../core/models/student';

import { StudentPicker } from '../student-picker/student-picker';
import { RelationshipToggle } from '../relationship-toggle/relationship-toggle';
import {
  findTakenRelationships,
  getClassSection,
  getFullName,
  isRelationshipTaken,
  NO_TAKEN_RELATIONSHIPS,
  TakenRelationships
} from '../parents';


// The parent to link a child to.
export interface ParentLinkChildDialogData {
  parent: ParentDto;
}

// Returned after a successful link: the updated parent (with the new child).
export interface ParentLinkChildResult {
  parent: ParentDto;
}


// "Link a child" (POST /api/parents/{parentId}/students).
// Opened from the table menu, the parent details,
// and the add form (when the phone number belongs to this parent).
@Component({
  selector: 'app-parent-link-child',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    StudentPicker,
    RelationshipToggle,
  ],
  templateUrl: './parent-link-child.html',
  styleUrl: './parent-link-child.css',
})
export class ParentLinkChild {

  private readonly parentsService = inject(ParentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef =
    inject(MatDialogRef<ParentLinkChild, ParentLinkChildResult>);

  readonly data = inject<ParentLinkChildDialogData>(MAT_DIALOG_DATA);


  // The children this parent already has (disabled in the search results).
  readonly linkedStudentIds = this.data.parent.children.map(
    child => child.studentId
  );

  // The chosen student (null = still searching).
  readonly student = signal<Student | null>(null);

  readonly relationship = signal<ParentRelationship | null>(null);

  // The father / mother the chosen student already has.
  readonly taken = signal<TakenRelationships>(NO_TAKEN_RELATIONSHIPS);

  // True while the chosen student's parents are being loaded.
  readonly isChecking = signal(false);

  readonly isSubmitting = signal(false);

  readonly canLink = computed(() =>
    !!this.student() &&
    this.relationship() !== null &&
    !this.isChecking() &&
    !this.isSubmitting()
  );

  readonly parentName = getFullName(this.data.parent);

  readonly getFullName = getFullName;
  readonly getClassSection = getClassSection;


  // A student was chosen: load their parents to know the taken father / mother.
  selectStudent(student: Student): void {

    this.student.set(student);
    this.relationship.set(null);
    this.taken.set(NO_TAKEN_RELATIONSHIPS);
    this.isChecking.set(true);

    this.parentsService
      .getParents({ studentId: student.studentId, pageSize: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (this.student()?.studentId !== student.studentId) {
            return;
          }

          if (response.success) {
            this.taken.set(
              findTakenRelationships(response.data.items, student.studentId)
            );
          }

          this.isChecking.set(false);
        },

        // Not blocking: the backend still refuses a second father / mother.
        error: (error: HttpErrorResponse) => {

          console.error('Failed to load the student\'s parents:', error);

          this.isChecking.set(false);
        },
      });
  }


  // "Change": back to the search.
  changeStudent(): void {
    this.student.set(null);
    this.relationship.set(null);
    this.taken.set(NO_TAKEN_RELATIONSHIPS);
    this.isChecking.set(false);
  }


  setRelationship(relationship: ParentRelationship): void {

    if (!isRelationshipTaken(this.taken(), relationship)) {
      this.relationship.set(relationship);
    }
  }


  link(): void {

    const student = this.student();
    const relationship = this.relationship();

    if (!this.canLink() || !student || relationship === null) {
      return;
    }

    this.isSubmitting.set(true);

    this.parentsService
      .linkChild(this.data.parent.parentId, {
        studentId: student.studentId,
        relationship,
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

          this.dialogRef.close({ parent: response.data });

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to link the child:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  cancel(): void {
    this.dialogRef.close();
  }
}
