import { Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
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
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../../core/services/api-message';
import { SubjectPlansService } from '../../../../core/services/subject-plans';
import { ActionResult } from '../../../../shared/services/action-result';
import { Language } from '../../../../core/services/language';
import {
  SubjectPlan,
  SubjectPlanComponent,
} from '../../../../core/models/subject-plan';

import { formatNumber, FULL_WEIGHT, sortComponents } from '../../shared/subjects-shared';
import {
  arabicNameValidator,
  COMPONENT_NAME_MAX_LENGTH,
  englishNameValidator,
  maxMarkValidator,
  totalWeight,
  weightValidator,
} from '../plan-validators';
import { PlanWeightBar } from '../plan-weight-bar/plan-weight-bar';
import {
  errorsCountKey,
  focusFirstInvalid,
  restartWhenCleared,
  showFieldError,
  useDiscardOnClose,
} from '../../shared/subjects-form-dialog';


// Data passed by the plan details page.
export interface PlanComponentFormData {
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
//
// The shared form dialog look (navy & gold, 13 Nov 2026), like the class form:
// "Discard changes?" before closing with unsaved changes, errors shown at the
// right time (showFieldError), the first wrong field focused on save.
// The type is a two-choice switch (.choice-switch in styles.css).
// Opened by the plan details page with panelClass 'form-dialog'.
@Component({
  selector: 'app-plan-component-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PlanWeightBar,
    TranslatePipe,
  ],
  templateUrl: './plan-component-form.html',
  styleUrl: './plan-component-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd',
  },
})
export class PlanComponentForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<PlanComponentForm, SubjectPlan>);

  private readonly plansService = inject(SubjectPlansService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly data = inject<PlanComponentFormData>(MAT_DIALOG_DATA);

  readonly isEditMode = this.data.mode === 'edit';

  readonly isSubmitting = signal(false);

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);
  readonly errorsKey = computed(() => errorsCountKey(this.invalidCount()));

  // The line under the title: "Mathematics · First Grade".
  readonly planLine = computed(() => {
    const plan = this.data.plan;

    return this.language.currentDirection() === 'rtl'
      ? `${plan.subjectAr} · ${plan.classNameAr}`
      : `${plan.subjectEn} · ${plan.classNameEn}`;
  });

  readonly nameMaxLength = COMPONENT_NAME_MAX_LENGTH;


  // The weight left for this component: 100 minus the other components.
  readonly remaining = (() => {

    const others = this.data.plan.components
      .filter(c => c.subjectPlanComponentId !== this.data.component?.subjectPlanComponentId)
      .map(c => c.weight);

    return Math.max(FULL_WEIGHT - totalWeight(others), 0);
  })();

  readonly remainingLabel = formatNumber(this.remaining);


  // =========================
  // Weight bar
  // =========================

  // The other components, in the plan's order (as in the details page).
  private readonly otherComponents = sortComponents(this.data.plan.components)
    .filter(c => c.subjectPlanComponentId !== this.data.component?.subjectPlanComponentId);

  // Where this component sits in the bar:
  // its own place when editing, after the last one when adding.
  private readonly barPosition = (() => {

    if (!this.isEditMode) {
      return this.otherComponents.length;
    }

    const index = sortComponents(this.data.plan.components)
      .findIndex(c => c.subjectPlanComponentId === this.data.component?.subjectPlanComponentId);

    return index >= 0 ? index : this.otherComponents.length;
  })();

  // The weight typed in the form (0 while empty).
  private readonly currentWeight = signal(Number(this.data.component?.weight) || 0);

  // The plan's weights with this component's weight as it is typed.
  readonly barWeights = computed(() => {

    const weights = this.otherComponents.map(c => c.weight);

    weights.splice(this.barPosition, 0, this.currentWeight());

    return weights;
  });

  // true right after the weight was cut down to what is left
  // (shows the "total cannot exceed 100%" message under the bar).
  readonly weightCapped = signal(false);

  // The last weight of the field, after any cut (see limitWeight).
  private lastWeight: number | null = this.data.component?.weight ?? null;

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
      [Validators.required, Validators.maxLength(COMPONENT_NAME_MAX_LENGTH), arabicNameValidator],
    ],

    nameEn: [
      this.data.component?.nameEn ?? '',
      [Validators.required, Validators.maxLength(COMPONENT_NAME_MAX_LENGTH), englishNameValidator],
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


  // ✕, Cancel, backdrop click and Esc: asks first when something changed.
  readonly closing = useDiscardOnClose({
    isDirty: () => this.componentForm.dirty,
    isBusy: () => this.isSubmitting(),
  });


  constructor() {

    // Keep the error count up to date while the user fixes the fields.
    this.componentForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    const c = this.componentForm.controls;
    restartWhenCleared([c.nameAr, c.nameEn, c.weight, c.maxMark, c.order], this.destroyRef);

    this.updateMaxMarkRules(this.isOpen());

    this.componentForm.controls.isOpen.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isOpen => {
        this.isOpen.set(!!isOpen);
        this.updateMaxMarkRules(!!isOpen);
      });

    // The weight can never take the total above 100: it is cut down to what is left.
    this.componentForm.controls.weight.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(weight => this.limitWeight(weight));
  }


  // Called on every valueChanges of the weight field.
  // A value above what is left is replaced by what is left
  // (or emptied when nothing is left), and the message is shown.
  private limitWeight(weight: number | null): void {

    const current = (weight as unknown) === '' ? null : weight;

    // A number input sends its value on "input" while typing, then again on
    // "change" when the user leaves the field. The repeated value is not
    // a new edit, so it must not hide the message.
    if (current === this.lastWeight) {
      return;
    }

    if (current === null || Number(current) <= this.remaining) {
      this.lastWeight = current;
      this.currentWeight.set(Number(current) || 0);
      this.weightCapped.set(false);
      return;
    }

    const value = this.remaining > 0 ? this.remaining : null;

    // emitEvent: false = this change does not call limitWeight again.
    const weightControl = this.componentForm.controls.weight;
    weightControl.setValue(value, { emitEvent: false });
    weightControl.markAsTouched();

    this.lastWeight = value;
    this.currentWeight.set(value ?? 0);
    this.weightCapped.set(true);
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


  // Wrong characters at once, other errors on leaving the field,
  // an empty field after pressing the button (see showFieldError()).
  isInvalid(name: keyof typeof this.componentForm.controls): boolean {
    return showFieldError(this.componentForm.controls[name], this.submitAttempted());
  }


  private countInvalid(): number {
    return Object.values(this.componentForm.controls)
      .filter((control: AbstractControl) => control.invalid)
      .length;
  }


  onSubmit(): void {

    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    if (this.componentForm.invalid) {
      this.componentForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      focusFirstInvalid(this.host);
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

}