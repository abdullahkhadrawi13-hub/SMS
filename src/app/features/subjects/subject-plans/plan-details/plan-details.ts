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
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { Observable } from 'rxjs';

import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { Permissions } from '../../../../core/services/permissions';
import { SubjectPlansService } from '../../../../core/services/subject-plans';
import { TeacherAssignmentsService } from '../../../../core/services/teacher-assignments';
import { ActionResult } from '../../../../shared/services/action-result';
import { ApiResponse } from '../../../../core/models/api-response';
import {
  SubjectPlan,
  SubjectPlanComponent,
} from '../../../../core/models/subject-plan';
import { TeacherAssignment } from '../../../../core/models/teacher-assignment';

import {
  componentColor,
  formatNumber,
  FULL_WEIGHT,
  getPlanStatus,
  PLAN_STATUS_BADGE,
  sortComponents,
  SubjectsTab,
} from '../../subject';
import { passingMarkValidator } from '../plan-validators';
import { PlanWeightBar } from '../plan-weight-bar/plan-weight-bar';
import { ComponentForm, ComponentFormData } from '../component-form/component-form';
import {
  PlanConfirmData,
  PlanConfirmDialog,
} from '../plan-confirm-dialog/plan-confirm-dialog';


// One component row of the table, with its name and color.
interface ComponentRow {
  component: SubjectPlanComponent;
  nameAr: string;
  nameEn: string;
  color: string;
}


// One section that follows the plan (from its teacher assignment).
interface PlanSection {
  assignmentId: number;
  sectionName: string;
  teacherName: string;
  isActive: boolean;
}


// The page of one subject plan: /subjects/plans/:planId
// (SMS API Reference, section 9).
//
// Shows the plan of one subject for one class and term:
//   - the passing mark (editable inline by the Admin)
//   - the weights bar and the components table
//     (add / edit / delete a component, Admin only)
//   - the sections that follow the plan, and their teachers
//   - the lock: locked after the first mark; the Admin can unlock it
//     (and lock it by hand when the weights add up to 100)
//
// Every write returns the whole plan, so the page just shows what comes back.
// The Assistant Principal sees everything without the actions.
@Component({
  selector: 'app-plan-details',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    PlanWeightBar,
    TranslatePipe,
  ],
  templateUrl: './plan-details.html',
  styleUrl: './plan-details.css',
})
export class PlanDetails implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly plansService = inject(SubjectPlansService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly permissions = inject(Permissions);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);


  // Only the Admin changes plans. The Assistant Principal can only read.
  readonly canManage = this.permissions.canManageSubjects;

  readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly formatNumber = formatNumber;
  readonly fullWeight = FULL_WEIGHT;


  // =========================
  // Data
  // =========================

  readonly plan = signal<SubjectPlan | null>(null);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly notFound = signal(false);

  // The sections that follow the plan.
  readonly sections = signal<PlanSection[]>([]);
  readonly sectionsLoading = signal(false);

  // true while a lock / delete / passing mark request is running.
  readonly isBusy = signal(false);


  private planId = 0;


  // =========================
  // View data
  // =========================

  readonly subjectName = computed(() => {
    const plan = this.plan();
    return plan ? (this.isArabic() ? plan.subjectAr : plan.subjectEn) : '';
  });

  readonly className = computed(() => {
    const plan = this.plan();
    return plan ? (this.isArabic() ? plan.classNameAr : plan.classNameEn) : '';
  });

  readonly termName = computed(() => {
    const plan = this.plan();
    return plan ? (this.isArabic() ? plan.academicTermNameAr : plan.academicTermNameEn) : '';
  });

  readonly badge = computed(() => {
    const plan = this.plan();
    return plan ? PLAN_STATUS_BADGE[getPlanStatus(plan)] : null;
  });

  readonly rows = computed<ComponentRow[]>(() => {

    const plan = this.plan();

    if (!plan) {
      return [];
    }

    return sortComponents(plan.components).map((component, index) => ({
      component,
      nameAr: component.nameAr,
      nameEn: component.nameEn,
      color: componentColor(index),
    }));
  });

  readonly weights = computed(
    () => this.rows().map(r => r.component.weight)
  );

  readonly remainingWeight = computed(() => {
    const plan = this.plan();
    return plan ? formatNumber(FULL_WEIGHT - plan.totalWeight) : '';
  });

  // The plan can be changed only while unlocked (and by the Admin).
  readonly canEdit = computed(
    () => this.canManage() && !!this.plan() && !this.plan()!.isLocked
  );

  // A component can be added while unlocked and the weights are under 100.
  readonly canAddComponent = computed(
    () => this.canEdit() && (this.plan()?.totalWeight ?? 0) < FULL_WEIGHT
  );

  readonly displayedColumns = computed(() =>
    this.canManage()
      ? ['name', 'type', 'weight', 'maxMark', 'actions']
      : ['name', 'type', 'weight', 'maxMark']
  );

  // Back to the plans tab, on the same term and class.
  readonly backQueryParams = computed(() => this.tabQueryParams('plans'));

  readonly assignmentsQueryParams = computed(() => this.tabQueryParams('assignments'));


  // =========================
  // Passing mark (inline edit)
  // =========================

  readonly isEditingMark = signal(false);

  readonly markControl = new FormControl<number | null>(null, [
    Validators.required,
    passingMarkValidator,
  ]);


  ngOnInit(): void {

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.planId = Number(params.get('planId'));
        this.loadPlan();
      });
  }


  // =========================
  // Loading
  // =========================

  // GET /api/subjectplans/{planId}
  loadPlan(): void {

    if (!Number.isInteger(this.planId) || this.planId <= 0) {
      this.notFound.set(true);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.notFound.set(false);

    this.plansService
      .getPlan(this.planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isLoading.set(false);

          if (!response.success) {
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            return;
          }

          this.setPlan(response.data);
          this.loadSections(response.data);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load subject plan:', error);

          this.isLoading.set(false);

          if (error.status === 404) {
            this.notFound.set(true);
            return;
          }

          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // GET /api/teacherassignments?academicTermId=... filtered by this plan.
  // A failure only hides the list.
  private loadSections(plan: SubjectPlan): void {

    this.sectionsLoading.set(true);

    this.assignmentsService
      .getAssignments({ academicTermId: plan.academicTermId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          const isArabic = this.isArabic();

          const sections = (response.success ? response.data : [])
            .filter(a => this.followsPlan(a, plan))
            .map(a => ({
              assignmentId: a.teacherAssignmentId,
              sectionName: isArabic ? a.sectionAr : a.sectionEn,
              teacherName: (isArabic ? a.teacherNameAr : a.teacherNameEn) || a.teacherNumber,
              isActive: a.isActive,
            }))
            .sort((a, b) => a.sectionName.localeCompare(b.sectionName));

          this.sections.set(sections);
          this.sectionsLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the plan sections:', error);
          this.sections.set([]);
          this.sectionsLoading.set(false);
        },
      });
  }


  // An assignment follows the plan by its id, or (when the id is missing)
  // by the same term + class + subject.
  private followsPlan(assignment: TeacherAssignment, plan: SubjectPlan): boolean {

    if (assignment.subjectPlanId !== null) {
      return assignment.subjectPlanId === plan.subjectPlanId;
    }

    return assignment.classId === plan.classId
      && assignment.subjectId === plan.subjectId;
  }


  private setPlan(plan: SubjectPlan): void {
    this.plan.set(plan);
    this.isEditingMark.set(false);
  }


  // =========================
  // Lock
  // =========================

  // Locked → "Unlock" (with a confirmation).
  // Unlocked and complete → "Lock" (with a confirmation).
  toggleLock(): void {

    const plan = this.plan();

    if (!plan || this.isBusy()) {
      return;
    }

    const unlocking = plan.isLocked;

    const confirmData: PlanConfirmData = unlocking
      ? {
          icon: 'lock_open',
          titleKey: 'SUBJECTS.PLAN_CONFIRM.UNLOCK_TITLE',
          messageKey: plan.hasGrades
            ? 'SUBJECTS.PLAN_CONFIRM.UNLOCK_MESSAGE_GRADES'
            : 'SUBJECTS.PLAN_CONFIRM.UNLOCK_MESSAGE',
          messageParams: { count: plan.assignmentCount },
          confirmKey: 'SUBJECTS.PLAN_CONFIRM.UNLOCK',
          tone: 'warn',
        }
      : {
          icon: 'lock',
          titleKey: 'SUBJECTS.PLAN_CONFIRM.LOCK_TITLE',
          messageKey: 'SUBJECTS.PLAN_CONFIRM.LOCK_MESSAGE',
          confirmKey: 'SUBJECTS.PLAN_CONFIRM.LOCK',
          tone: 'warn',
        };

    this.confirm(confirmData, () =>
      this.runPlanRequest(
        this.plansService.setLock(plan.subjectPlanId, !unlocking),
        'Failed to change the plan lock:'
      )
    );
  }


  // =========================
  // Passing mark
  // =========================

  startEditMark(): void {

    const plan = this.plan();

    if (!plan || !this.canEdit()) {
      return;
    }

    this.markControl.setValue(Number(formatNumber(plan.passingMark)));
    this.markControl.markAsUntouched();
    this.isEditingMark.set(true);
  }

  cancelEditMark(): void {
    this.isEditingMark.set(false);
  }

  // PUT /api/subjectplans/{id} with { passingMark }.
  saveMark(): void {

    const plan = this.plan();

    if (!plan) {
      return;
    }

    if (this.markControl.invalid) {
      this.markControl.markAsTouched();
      return;
    }

    this.runPlanRequest(
      this.plansService.updatePlan(plan.subjectPlanId, {
        passingMark: Number(this.markControl.value),
      }),
      'Failed to update the passing mark:'
    );
  }


  // =========================
  // Components
  // =========================

  openAddComponent(): void {
    this.openComponentForm({ mode: 'add', plan: this.plan()! });
  }

  openEditComponent(row: ComponentRow): void {
    this.openComponentForm({ mode: 'edit', plan: this.plan()!, component: row.component });
  }

  // DELETE /api/subjectplans/components/{id} (with a confirmation).
  // The backend refuses it when the component has marks.
  deleteComponent(row: ComponentRow): void {

    this.confirm(
      {
        icon: 'delete',
        titleKey: 'SUBJECTS.PLAN_CONFIRM.DELETE_COMPONENT_TITLE',
        messageKey: row.component.teacherAddsAssessments
          ? 'SUBJECTS.PLAN_CONFIRM.DELETE_OPEN_COMPONENT_MESSAGE'
          : 'SUBJECTS.PLAN_CONFIRM.DELETE_FIXED_COMPONENT_MESSAGE',
        messageParams: { name: this.isArabic() ? row.nameAr : row.nameEn },
        confirmKey: 'SUBJECTS.PLAN_CONFIRM.DELETE',
        tone: 'danger',
      },
      () => this.runPlanRequest(
        this.plansService.deleteComponent(row.component.subjectPlanComponentId),
        'Failed to delete the plan component:'
      )
    );
  }

  private openComponentForm(data: ComponentFormData): void {

    if (!data.plan) {
      return;
    }

    this.dialog
      .open(ComponentForm, {
        width: '600px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data,
      })
      .afterClosed()
      .subscribe((plan?: SubjectPlan) => {
        if (plan) {
          this.setPlan(plan);
        }
      });
  }


  // =========================
  // Delete the plan
  // =========================

  // DELETE /api/subjectplans/{id}: only when no section follows the plan.
  // Afterwards the page goes back to the plans tab.
  deletePlan(): void {

    const plan = this.plan();

    if (!plan || plan.assignmentCount > 0 || this.isBusy()) {
      return;
    }

    this.confirm(
      {
        icon: 'delete',
        titleKey: 'SUBJECTS.PLAN_CONFIRM.DELETE_PLAN_TITLE',
        messageKey: 'SUBJECTS.PLAN_CONFIRM.DELETE_PLAN_MESSAGE',
        messageParams: { subject: this.subjectName(), className: this.className() },
        confirmKey: 'SUBJECTS.PLAN_CONFIRM.DELETE',
        tone: 'danger',
      },
      () => {

        const backParams = this.backQueryParams();

        this.isBusy.set(true);

        this.plansService
          .deletePlan(plan.subjectPlanId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (response) => {

              this.isBusy.set(false);

              if (!response.success) {
                this.actionResult.show('error', this.apiMessageService.getMessage(response));
                return;
              }

              this.actionResult.show('success', this.apiMessageService.getMessage(response));

              this.router.navigate(['/subjects'], { queryParams: backParams });
            },

            error: (error: HttpErrorResponse) => {

              console.error('Failed to delete the subject plan:', error);

              this.isBusy.set(false);

              this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
            },
          });
      }
    );
  }


  // =========================
  // Helpers
  // =========================

  // Opens the confirmation dialog and runs the action when confirmed.
  private confirm(data: PlanConfirmData, action: () => void): void {

    this.dialog
      .open(PlanConfirmDialog, { maxWidth: '95vw', data })
      .afterClosed()
      .subscribe((confirmed?: boolean) => {
        if (confirmed) {
          action();
        }
      });
  }


  // Runs a request that returns the whole plan, then shows the new plan
  // and the backend message.
  private runPlanRequest(
    request: Observable<ApiResponse<SubjectPlan>>,
    logMessage: string
  ): void {

    this.isBusy.set(true);

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isBusy.set(false);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          this.setPlan(response.data);

          this.actionResult.show('success', this.apiMessageService.getMessage(response));
        },

        error: (error: HttpErrorResponse) => {

          console.error(logMessage, error);

          this.isBusy.set(false);

          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // ?tab=...&termId=...&classId=... of the Subjects page, for this plan.
  private tabQueryParams(tab: SubjectsTab): Record<string, string | number> {

    const plan = this.plan();

    return plan
      ? { tab, termId: plan.academicTermId, classId: plan.classId }
      : { tab };
  }
}
