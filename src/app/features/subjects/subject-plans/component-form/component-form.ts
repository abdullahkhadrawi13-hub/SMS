import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../../core/services/api-message';
import { SubjectPlansService } from '../../../../core/services/subject-plans';
import { ActionResult } from '../../../../shared/services/action-result';
import {
  SubjectPlan,
  SubjectPlanComponent,
} from '../../../../core/models/subject-plan';

import { formatNumber, FULL_WEIGHT } from '../../subject';
import {
  COMPONENT_NAME_MAX_LENGTH,
  maxMarkValidator,
  totalWeight,
  weightValidator,
} from '../plan-validators';


// Data passed by the plan details page.
export interface ComponentFormData {
  mode: 'add' | 'edit';

  plan: SubjectPlan;

  // Edit mode only.
  component?: SubjectPlanComponent;
}


// The weight cannot be more than what is left to reach 100.
function withinRemaining(remaining: number): ValidatorFn {

  return (control: AbstractControl): ValidationErrors | null => {

    const value = control.value;

    if (value === null || value === '') {
      return null;
    }

    return Number(value) <= remaining + 0.0001
      ? null
      : { overRemaining: true };
  };
}


// Add a component to a plan, or edit one
// (POST /api/subjectplans/{id}/components, PUT /api/subjectplans/components/{id}).
// The type (fixed / open) is chosen when adding and never changes after:
// to change it, delete the component and add a new one.
// Both requests return the whole plan; the dialog closes with it.
@Component({
  selector: 'app-component-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
  ],
  templateUrl: './component-form.html',
  styleUrl: './component-form.css',
})
export class ComponentForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<ComponentForm, SubjectPlan>);

  private readonly plansService = inject(SubjectPlansService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<ComponentFormData>(MAT_DIALOG_DATA);

  readonly isEditMode = this.data.mode === 'edit';

  readonly isSubmitting = signal(false);

  readonly nameMaxLength = COMPONENT_NAME_MAX_LENGTH;


  // The weight left for this component: 100 minus the other components.
  readonly remaining = (() => {

    const others = this.data.plan.components
      .filter(c => c.subjectPlanComponentId !== this.data.component?.subjectPlanComponentId)
      .map(c => c.weight);

    return Math.max(FULL_WEIGHT - totalWeight(others), 0);
  })();

  readonly remainingLabel = formatNumber(this.remaining);

  // Editing a fixed component of a plan that has marks: its max mark
  // may be refused by the backend when this component has marks.
  readonly showMaxMarkNote =
    this.isEditMode
    && this.data.plan.hasGrades
    && this.data.component?.teacherAddsAssessments === false;


  // The order of a new component: after the last one.
  private readonly nextOrder =
    Math.max(0, ...this.data.plan.components.map(c => c.order)) + 1;


  readonly componentForm = this.fb.group({

    nameAr: [
      this.data.component?.nameAr ?? '',
      [Validators.required, Validators.maxLength(COMPONENT_NAME_MAX_LENGTH)],
    ],

    nameEn: [
      this.data.component?.nameEn ?? '',
      [Validators.required, Validators.maxLength(COMPONENT_NAME_MAX_LENGTH)],
    ],

    // true = open (the teacher adds quizzes). Fixed in edit mode.
    isOpen: [{
      value: this.data.component?.teacherAddsAssessments ?? false,
      disabled: this.isEditMode,
    }],

    weight: [
      (this.data.component?.weight ?? null) as number | null,
      [Validators.required, weightValidator, withinRemaining(this.remaining)],
    ],

    maxMark: [
      (this.data.component?.maxMark ?? null) as number | null,
      [maxMarkValidator],
    ],

    order: [
      (this.data.component?.order ?? this.nextOrder) as number | null,
      [Validators.required, Validators.min(0)],
    ],
  });


  // true while the chosen type is "open" (the max mark field is hidden).
  readonly isOpen = signal(this.componentForm.controls.isOpen.value ?? false);

  readonly isFixed = computed(() => !this.isOpen());


  constructor() {

    this.updateMaxMarkRules(this.isOpen());

    this.componentForm.controls.isOpen.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isOpen => {
        this.isOpen.set(!!isOpen);
        this.updateMaxMarkRules(!!isOpen);
      });
  }


  // A fixed component needs a max mark; an open one has none.
  private updateMaxMarkRules(isOpen: boolean): void {

    const maxMark = this.componentForm.controls.maxMark;

    if (isOpen) {
      maxMark.setValue(null);
      maxMark.clearValidators();
    } else {
      maxMark.setValidators([Validators.required, maxMarkValidator]);
    }

    maxMark.updateValueAndValidity();
  }


  isInvalid(control: AbstractControl): boolean {
    return control.invalid && control.touched;
  }


  onSubmit(): void {

    if (this.componentForm.invalid) {
      this.componentForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    const value = this.componentForm.getRawValue();
    const isOpen = !!value.isOpen;

    const body = {
      nameAr: (value.nameAr ?? '').trim(),
      nameEn: (value.nameEn ?? '').trim(),
      weight: Number(value.weight),
      maxMark: isOpen ? null : Number(value.maxMark),
      order: Number(value.order),
    };

    const request = this.isEditMode && this.data.component
      ? this.plansService.updateComponent(
          this.data.component.subjectPlanComponentId,
          body
        )
      : this.plansService.addComponent(
          this.data.plan.subjectPlanId,
          { ...body, teacherAddsAssessments: isOpen }
        );

    this.isSubmitting.set(true);

    request
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

          this.dialogRef.close(response.data);

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to save plan component:', error);

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
