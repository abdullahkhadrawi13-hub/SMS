import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../../core/services/api-message';
import { AssessmentsService } from '../../../../core/services/assessments';
import { Language } from '../../../../core/services/language';
import { SubjectPlansService } from '../../../../core/services/subject-plans';
import { TeacherAssignmentsService } from '../../../../core/services/teacher-assignments';
import { ActionResult } from '../../../../shared/services/action-result';
import { Assessment } from '../../../../core/models/assessment';
import { SubjectPlan } from '../../../../core/models/subject-plan';
import { TeacherAssignment } from '../../../../core/models/teacher-assignment';

import {
  componentColor,
  formatNumber,
  getPlanStatus,
  PLAN_STATUS_BADGE,
  sortComponents,
} from '../../../subjects/shared/subjects-shared';
import { PlanWeightBar } from '../../../subjects/subject-plans/plan-weight-bar/plan-weight-bar';
import {
  PlanConfirmData,
  PlanConfirmDialog,
} from '../../../subjects/subject-plans/plan-confirm-dialog/plan-confirm-dialog';

import { AssessmentFormData, ComponentGroup } from '../assessments';
import { AssessmentsHeader, PlanStatusBadge } from '../assessments-header/assessments-header';
import { PlanComponentCard } from '../plan-component-card/plan-component-card';
import { AssessmentForm } from '../assessment-form/assessment-form';


// The assessments of one subject in one section, for the teacher (parent page).
// Route: /my-classes/:teacherAssignmentId/assessments (opened from a "My classes" card).
//
// Loads (SMS API Reference, sections 8 and 9):
//   1. GET /api/teacherassignments/mine: the assignment itself (subject, class,
//      section, term). A teacher cannot read GET /api/teacherassignments/{id} (403),
//      and an assignment that is not in "mine" is shown as not found.
//   2. GET /api/subjectplans/by-assignment/{id}: the components, weights and
//      passing mark (404 = the administration has not made the plan yet).
//   3. GET /api/assessments/by-assignment/{id}: the assessments, grouped
//      under their components.
//
// The teacher adds, edits and deletes assessments under open components only.
// Fixed assessments come from the plan and are read-only here.
@Component({
  selector: 'app-assessments-page',
  imports: [
    RouterLink,
    AssessmentsHeader,
    PlanComponentCard,
    PlanWeightBar,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './assessments-page.html',
  styleUrl: './assessments-page.css',
})
export class AssessmentsPage implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly plansService = inject(SubjectPlansService);
  private readonly assessmentsService = inject(AssessmentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  private teacherAssignmentId = 0;

  readonly assignment = signal<TeacherAssignment | null>(null);

  // null while loading, or when there is no plan (see noPlan).
  readonly plan = signal<SubjectPlan | null>(null);

  readonly assessments = signal<Assessment[]>([]);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // The assignment is not one of the teacher's (current term), or the id is wrong.
  readonly notFound = signal(false);

  // The administration has not made the subject plan yet.
  readonly noPlan = signal(false);

  // The assessment being deleted.
  readonly busyAssessmentId = signal<number | null>(null);

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // =========================
  // Header values (current language)
  // =========================

  readonly subjectName = computed(() => {
    const a = this.assignment();
    return a ? (this.isArabic() ? a.subjectAr : a.subjectEn) : '';
  });

  readonly className = computed(() => {
    const a = this.assignment();
    return a ? (this.isArabic() ? a.classNameAr : a.classNameEn) : '';
  });

  readonly sectionName = computed(() => {
    const a = this.assignment();
    return a ? (this.isArabic() ? a.sectionAr : a.sectionEn) : '';
  });

  readonly termName = computed(() => {
    const a = this.assignment();
    return a ? (this.isArabic() ? a.academicTermNameAr : a.academicTermNameEn) : '';
  });

  readonly passingMark = computed(() => {
    const plan = this.plan();
    return plan ? formatNumber(plan.passingMark) : null;
  });

  readonly planBadge = computed<PlanStatusBadge | null>(() => {
    const plan = this.plan();
    return plan ? PLAN_STATUS_BADGE[getPlanStatus(plan)] : null;
  });


  // =========================
  // Components and their assessments
  // =========================

  // One group per plan component, in the components' order.
  // The color is the component's position color, as in the Admin's plan page.
  readonly groups = computed<ComponentGroup[]>(() => {

    const plan = this.plan();

    if (!plan) {
      return [];
    }

    const isArabic = this.isArabic();
    const assessments = this.assessments();

    return sortComponents(plan.components).map((component, index) => ({
      component,
      componentName: isArabic ? component.nameAr : component.nameEn,
      color: componentColor(index),
      assessments: assessments
        .filter(a => a.subjectPlanComponentId === component.subjectPlanComponentId)
        .sort((a, b) => a.order - b.order),
    }));
  });

  // The weights for the weight bar, in the components' order.
  readonly weights = computed(
    () => this.groups().map(group => group.component.weight)
  );


  ngOnInit(): void {

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.teacherAssignmentId = Number(params.get('teacherAssignmentId'));
        this.loadPage();
      });
  }


  // =========================
  // Loading
  // =========================

  loadPage(): void {

    this.assignment.set(null);
    this.plan.set(null);
    this.assessments.set([]);
    this.errorMessage.set('');
    this.notFound.set(false);
    this.noPlan.set(false);

    if (!Number.isInteger(this.teacherAssignmentId) || this.teacherAssignmentId <= 0) {
      this.notFound.set(true);
      return;
    }

    this.isLoading.set(true);

    // 1. The assignment, from the teacher's own assignments (current term).
    this.assignmentsService
      .getMyAssignments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.showLoadError(this.apiMessageService.getMessage(response));
            return;
          }

          const assignment = response.data.find(
            a => a.teacherAssignmentId === this.teacherAssignmentId
          );

          if (!assignment) {
            this.isLoading.set(false);
            this.notFound.set(true);
            return;
          }

          this.assignment.set(assignment);

          if (assignment.subjectPlanId === null) {
            this.isLoading.set(false);
            this.noPlan.set(true);
            return;
          }

          this.loadPlanAndAssessments();
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the assignment:', error);
          this.showLoadError(this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // 2 + 3. The plan and the assessments, together.
  // A 404 on the plan means "no plan yet", not an error.
  private loadPlanAndAssessments(): void {

    const plan$ = this.plansService
      .getPlanByAssignment(this.teacherAssignmentId)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of(null) : throwError(() => error)
        )
      );

    forkJoin({
      plan: plan$,
      assessments: this.assessmentsService
        .getAssessmentsByAssignment(this.teacherAssignmentId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ plan, assessments }) => {

          if (plan === null) {
            this.isLoading.set(false);
            this.noPlan.set(true);
            return;
          }

          if (!plan.success) {
            this.showLoadError(this.apiMessageService.getMessage(plan));
            return;
          }

          if (!assessments.success) {
            this.showLoadError(this.apiMessageService.getMessage(assessments));
            return;
          }

          this.plan.set(plan.data);
          this.assessments.set(assessments.data);
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the plan or the assessments:', error);
          this.showLoadError(this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // After adding, editing or deleting: refresh the assessments only
  // (the page stays as it is while the answer comes back).
  private reloadAssessments(): void {

    this.assessmentsService
      .getAssessmentsByAssignment(this.teacherAssignmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.assessments.set(response.data);
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to reload the assessments:', error);
        },
      });
  }


  private showLoadError(message: string): void {
    this.errorMessage.set(message);
    this.isLoading.set(false);
  }


  // =========================
  // Actions (open components only)
  // =========================

  openAddAssessment(group: ComponentGroup): void {

    const lastOrder = Math.max(0, ...group.assessments.map(a => a.order));

    this.openForm({
      mode: 'add',
      teacherAssignmentId: this.teacherAssignmentId,
      component: group.component,
      componentName: group.componentName,
      color: group.color,
      nextOrder: lastOrder + 1,
    });
  }


  openEditAssessment(group: ComponentGroup, assessment: Assessment): void {

    this.openForm({
      mode: 'edit',
      teacherAssignmentId: this.teacherAssignmentId,
      component: group.component,
      componentName: group.componentName,
      color: group.color,
      assessment,
      nextOrder: assessment.order,
    });
  }


  private openForm(data: AssessmentFormData): void {

    this.dialog
      .open<AssessmentForm, AssessmentFormData, Assessment>(AssessmentForm, {
        data,
        width: '520px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(saved => {
        if (saved) {
          this.reloadAssessments();
        }
      });
  }


  // "Delete Quiz 2?" first: a deleted assessment cannot come back.
  confirmDeleteAssessment(assessment: Assessment): void {

    const name = this.isArabic() ? assessment.nameAr : assessment.nameEn;

    this.dialog
      .open<PlanConfirmDialog, PlanConfirmData, boolean>(PlanConfirmDialog, {
        data: {
          icon: 'delete',
          titleKey: 'MY_CLASSES.ASSESSMENTS.DELETE.TITLE',
          messageKey: 'MY_CLASSES.ASSESSMENTS.DELETE.MESSAGE',
          messageParams: { name },
          confirmKey: 'MY_CLASSES.ASSESSMENTS.DELETE.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.deleteAssessment(assessment);
        }
      });
  }


  // DELETE /api/assessments/{id}
  // 400 when the assessment has marks: the backend message is shown.
  private deleteAssessment(assessment: Assessment): void {

    this.busyAssessmentId.set(assessment.assessmentId);

    this.assessmentsService
      .deleteAssessment(assessment.assessmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.busyAssessmentId.set(null);

          this.actionResult.show(
            response.success ? 'success' : 'error',
            this.apiMessageService.getMessage(response)
          );

          if (response.success) {
            this.reloadAssessments();
          }
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to delete assessment:', error);

          this.busyAssessmentId.set(null);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }
}
