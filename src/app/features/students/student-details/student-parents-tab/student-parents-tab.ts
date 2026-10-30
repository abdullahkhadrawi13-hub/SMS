import {
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ParentsService } from '../../../../core/services/parents';
import { ApiMessageService } from '../../../../core/services/api-message';
import {
  getRelationshipTranslationKey,
  ParentDto,
  ParentRelationship
} from '../../../../core/models/parent';
import { getFullName } from '../../../parents/parents';


// One parent of the student, with the relationship to this student.
interface StudentParentRow {
  parent: ParentDto;
  relationship: ParentRelationship;
}


// The "Parents" tab of the student page (/students/:id?tab=parents):
// the parents of one student.
// GET /api/parents?studentId={id} (Admin, AssistantPrincipal). Read only.
//
// Like the attendance tab, it loads its own data: the student page
// only gives it the student id. The page creates it the first time the
// tab is opened, and keeps it while the page is open (no second request).
@Component({
  selector: 'app-student-parents-tab',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './student-parents-tab.html',
  styleUrl: './student-parents-tab.css',
})
export class StudentParentsTab implements OnInit {

  private readonly parentsService = inject(ParentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly destroyRef = inject(DestroyRef);


  readonly studentId = input.required<number>();


  readonly rows = signal<StudentParentRow[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly getFullName = getFullName;
  readonly getRelationshipTranslationKey = getRelationshipTranslationKey;


  ngOnInit(): void {
    this.loadParents();
  }


  loadParents(): void {

    const studentId = this.studentId();

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.parentsService
      // isActive is not sent: a deactivated parent is shown too
      // (their phone number still works).
      .getParents({ studentId, pageSize: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.rows.set([]);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response) ||
              'STUDENT_DETAILS.PARENTS_TAB.LOAD_FAILED'
            );
            this.isLoading.set(false);
            return;
          }

          this.rows.set(this.toRows(response.data.items, studentId));
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load the student\'s parents:', error);

          this.rows.set([]);
          this.errorMessage.set('STUDENT_DETAILS.PARENTS_TAB.LOAD_FAILED');
          this.isLoading.set(false);
        },
      });
  }


  // Each parent has every one of their children: the relationship to
  // this student is the one of the child with the same studentId.
  // Sorted father, mother, guardian (like the absentees list).
  private toRows(parents: ParentDto[], studentId: number): StudentParentRow[] {

    return parents
      .map(parent => ({
        parent,
        relationship:
          parent.children.find(child => child.studentId === studentId)
            ?.relationship ?? ParentRelationship.Guardian,
      }))
      .sort((a, b) => a.relationship - b.relationship);
  }
}
