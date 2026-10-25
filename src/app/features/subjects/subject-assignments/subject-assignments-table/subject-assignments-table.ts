import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { SubjectPlan } from '../../../../core/models/subject-plan';

import {
  SubjectAssignmentRow,
  SubjectAssignmentsCounts,
  formatNumber,
  getPlanStatus,
  PLAN_STATUS_BADGE,
} from '../../shared/subjects-shared';


// A subject with a plan for the class but no teacher in the section.
export interface MissingPlanSubject {
  subjectId: number;
  subjectName: string;
}


// The subjects of one section: toolbar (title, counters, add),
// table and the states (error / loading / select / empty).
// All data is owned by the parent (subject-assignments-tab).
@Component({
  selector: 'app-subject-assignments-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './subject-assignments-table.html',
  styleUrl: './subject-assignments-table.css',
})
export class SubjectAssignmentsTable {

  // ===== Inputs =====

  readonly rows = input<SubjectAssignmentRow[]>([]);
  readonly counts = input<SubjectAssignmentsCounts>({ total: 0, active: 0, inactive: 0 });

  // Subjects with a plan for the class but no teacher in this section.
  readonly missingSubjects = input<MissingPlanSubject[]>([]);

  // false until a term, a class and a section are chosen.
  readonly hasSelection = input(false);

  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Shown in the toolbar title and the empty state.
  readonly className = input('');
  readonly sectionName = input('');
  readonly termLabel = input('');

  // Shows the add button and the actions column (Admin only).
  readonly canManage = input(false);

  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the content.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.rows().length === 0
  );

  // Reload: the old data stays on the screen with a thin progress bar
  // on top, so the content does not disappear and jump.
  readonly isRefreshing = computed(() =>
    this.isLoading() && !(this.rows().length === 0)
  );

  // true while the add dialog is being prepared (disables the add button).
  readonly openingForm = input(false);


  // ===== Outputs =====

  readonly retry = output<void>();

  // null = the toolbar button (no subject chosen yet),
  // a subjectId = a subject of the "no teacher" line (preselected in the form).
  readonly addSubject = output<number | null>();

  readonly editSubject = output<SubjectAssignmentRow>();
  readonly viewPlan = output<SubjectAssignmentRow>();
  readonly toggleStatus = output<SubjectAssignmentRow>();


  // The Assistant Principal has no actions, so the column is hidden.
  readonly displayedColumns = computed(() => {

    const columns = [
      'subject',
      'teacher',
      'plan',
      'status',
    ];

    return this.canManage()
      ? [...columns, 'actions']
      : columns;
  });


  // ===== Plan column =====

  readonly formatNumber = formatNumber;

  // Icon, label and color of the plan's state (locked / ready / incomplete).
  planBadge(plan: SubjectPlan) {
    return PLAN_STATUS_BADGE[getPlanStatus(plan)];
  }

  // The names of the "no teacher" subjects, joined: "Islamic Education، Computer".
  readonly missingNames = computed(
    () => this.missingSubjects().map(s => s.subjectName).join('، ')
  );
}
