import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';

import { map } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { PHONE_QUERY } from '../../../../layouts/dashboard-layout/dashboard-layout';

import {
  SubjectAssignmentRow,
  formatNumber,
  nameInitials,
} from '../../shared/subjects-shared';
import { StateCard } from '../../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';


// A subject with a plan for the class but no teacher in the section.
export interface MissingPlanSubject {
  subjectId: number;
  subjectName: string;
}


// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css.
const AVATAR_TONES = 6;


// The subjects of one section: the "no teacher" note, the table
// (two-line items on the phone), the enrollment hint and the states
// (error / loading / select / empty).
// The look is the shared "Data table" in styles.css (.data-card, .data-table…).
// All data is owned by the parent (subject-assignments-tab).
@Component({
  selector: 'app-subject-assignments-table',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTableModule,
    TranslatePipe,
    StateCard,
    StatusBadge,
  ],
  templateUrl: './subject-assignments-table.html',
  styleUrl: './subject-assignments-table.css',
})
export class SubjectAssignmentsTable {

  // Under 720px: a two-line list instead of the table.
  readonly isPhone = toSignal(
    inject(BreakpointObserver).observe(PHONE_QUERY).pipe(map(r => r.matches)),
    { initialValue: false }
  );


  // ===== Inputs =====

  readonly rows = input<SubjectAssignmentRow[]>([]);

  // Subjects with a plan for the class but no teacher in this section.
  readonly missingSubjects = input<MissingPlanSubject[]>([]);

  // false until a term, a class and a section are chosen.
  readonly hasSelection = input(false);

  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Shown in the empty state and the "no teacher" note.
  readonly className = input('');
  readonly sectionName = input('');
  readonly termLabel = input('');

  // Shows "Change teacher", "Activate / Deactivate" and the "Assign a teacher" link (Admin only).
  // "View subject plan" is shown for everyone.
  readonly canManage = input(false);

  // true while the add dialog is being prepared.
  readonly openingForm = input(false);


  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the content.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.rows().length === 0
  );

  // Reload: the old rows stay on the screen with a thin progress bar
  // on top, so the content does not disappear and jump.
  readonly isRefreshing = computed(() =>
    this.isLoading() && this.rows().length > 0
  );


  // ===== Outputs =====

  readonly retry = output<void>();

  // A subjectId of the "no teacher" note (preselected in the form),
  // or null when several subjects are missing.
  readonly addSubject = output<number | null>();

  readonly editSubject = output<SubjectAssignmentRow>();
  readonly viewPlan = output<SubjectAssignmentRow>();
  readonly toggleStatus = output<SubjectAssignmentRow>();


  readonly displayedColumns = ['subject', 'teacher', 'status', 'actions'];


  // The names of the "no teacher" subjects, joined: "Islamic Education، Computer".
  readonly missingNames = computed(
    () => this.missingSubjects().map(s => s.subjectName).join('، ')
  );


  // ===== Plan warning =====
  // The plan belongs to the whole class, so it has no column here.
  // Only when it stops this section's teacher from entering marks,
  // a yellow badge shows next to the subject:
  //   - weights under 100: "Plan weights 80 of 100"
  //   - an old assignment made before subject plans existed: "No plan"
  // A plan that is ready (or locked with marks) shows nothing.

  planWarning(row: SubjectAssignmentRow): string | null {

    if (row.assignment.subjectPlanId === null) {
      return 'SUBJECTS.PLAN_STATUS.NONE';
    }

    if (row.plan && !row.plan.isComplete) {
      return 'SUBJECTS.ASSIGNMENTS_TABLE.PLAN_WEIGHTS';
    }

    return null;
  }

  warningParams(row: SubjectAssignmentRow): { total: string } {
    return { total: formatNumber(row.plan?.totalWeight ?? 0) };
  }


  // ===== Teacher avatar =====

  initials(row: SubjectAssignmentRow): string {
    return nameInitials(row.teacherName);
  }

  // The same colour for the same teacher, everywhere (like the teachers list).
  avatarTone(row: SubjectAssignmentRow): number {
    return (row.assignment.teacherId % AVATAR_TONES) + 1;
  }
}
