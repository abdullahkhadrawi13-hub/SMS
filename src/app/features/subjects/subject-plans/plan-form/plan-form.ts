import { Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
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
import { SubjectDto } from '../../../../core/models/subject';
import { SubjectPlan } from '../../../../core/models/subject-plan';

import {
  DEFAULT_PASSING_MARK,
  formatNumber,
  FULL_WEIGHT,
} from '../../shared/subjects-shared';
import {
  arabicNameValidator,
  COMPONENT_NAME_MAX_LENGTH,
  englishNameValidator,
  maxMarkValidator,
  passingMarkValidator,
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


// Data passed by the plans tab when the dialog is opened.
export interface PlanFormData {
  academicTermId: number;
  classId: number;

  // Names shown in the line under the title.
  termLabel: string;
  className: string;

  // The active subjects that have no plan for this term and class yet.
  subjects: SubjectDto[];

  // The subject chosen when the form opens (or null).
  preselectedSubjectId: number | null;
}


// One component row of the form.
type ComponentRow = ReturnType<PlanForm['createComponentRow']>;


// The plan as a whole: weights at most 100, no repeated component name.
function planComponentsValidator(control: AbstractControl): ValidationErrors | null {

  const rows = (control as FormArray).getRawValue() as {
    nameAr: string;
    nameEn: string;
    weight: number | null;
  }[];

  const errors: ValidationErrors = {};

  if (totalWeight(rows.map(r => r.weight)) > FULL_WEIGHT) {
    errors['overWeight'] = true;
  }

  const hasRepeat = (names: string[]) => {
    const clean = names.map(n => (n ?? '').trim().toLowerCase()).filter(n => n !== '');
    return new Set(clean).size !== clean.length;
  };

  if (hasRepeat(rows.map(r => r.nameAr)) || hasRepeat(rows.map(r => r.nameEn))) {
    errors['repeatedName'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// "New plan" for one subject of the selected class and term
// (POST /api/subjectplans, API Reference section 9).
// The components are added in the same form, but they are optional:
// the plan can be saved now and completed later in its details page.
//
// The shared form dialog look (navy & gold, 13 Nov 2026), like the class form:
// "Discard changes?" before closing with unsaved changes, errors shown at the
// right time (showFieldError), the first wrong field focused on save.
// Each component is one numbered row: the names on the first line,
// the type (.choice-switch), weight and max mark on the second.
// Opened by the plans tab with panelClass 'form-dialog'.
@Component({
  selector: 'app-plan-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PlanWeightBar,
    TranslatePipe,
  ],
  templateUrl: './plan-form.html',
  styleUrl: './plan-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd',
  },
})
export class PlanForm {

  private readonly fb = inject(FormBuilder);

  private readonly dialogRef =
    inject(MatDialogRef<PlanForm, SubjectPlan>);

  private readonly plansService = inject(SubjectPlansService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly data = inject<PlanFormData>(MAT_DIALOG_DATA);

  // true while the request is running (prevents double clicks).
  readonly isSubmitting = signal(false);

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);
  readonly errorsKey = computed(() => errorsCountKey(this.invalidCount()));

  readonly nameMaxLength = COMPONENT_NAME_MAX_LENGTH;
  readonly fullWeight = FULL_WEIGHT;


  readonly planForm = this.fb.group({

    // A preselected subject is used only when it is in the list.
    subjectId: [
      this.data.subjects.some(s => s.subjectId === this.data.preselectedSubjectId)
        ? this.data.preselectedSubjectId
        : null,
      [Validators.required],
    ],

    passingMark: [
      DEFAULT_PASSING_MARK as number | null,
      [Validators.required, passingMarkValidator],
    ],

    // The form starts with one empty component.
    components: this.fb.array(
      [this.createComponentRow()],
      { validators: planComponentsValidator }
    ),
  });


  get components(): FormArray<ComponentRow> {
    return this.planForm.controls.components;
  }


  // The weights while the admin types (for the bar and the "remaining" text).
  readonly weights = signal<number[]>([0]);

  readonly total = computed(() => totalWeight(this.weights()));

  readonly remaining = computed(
    () => formatNumber(Math.max(FULL_WEIGHT - this.total(), 0))
  );

  // true right after a weight was cut down so the total stays at 100
  // (shows the "total cannot exceed 100%" message under the bar).
  readonly weightCapped = signal(false);

  // The last weight of each row, after any cut (see limitWeight).
  private readonly lastWeights = new WeakMap<ComponentRow, number | null>();


  // ✕, Cancel, backdrop click and Esc: asks first when something changed.
  readonly closing = useDiscardOnClose({
    isDirty: () => this.planForm.dirty,
    isBusy: () => this.isSubmitting(),
  });


  constructor() {

    this.components.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateWeights());

    // Keep the error count up to date while the user fixes the fields.
    this.planForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    restartWhenCleared([this.planForm.controls.passingMark], this.destroyRef);
  }


  // =========================
  // Components
  // =========================

  createComponentRow() {

    const row = this.fb.group({

      nameAr: ['', [
        Validators.required,
        Validators.maxLength(COMPONENT_NAME_MAX_LENGTH),
        arabicNameValidator,
      ]],

      nameEn: ['', [
        Validators.required,
        Validators.maxLength(COMPONENT_NAME_MAX_LENGTH),
        englishNameValidator,
      ]],

      // true = open component (the teacher adds quizzes),
      // false = fixed component (one exam per section).
      isOpen: [false],

      weight: [null as number | null, [Validators.required, weightValidator]],

      // Required on the field itself, so mat-error shows "This field is required".
      // An open component disables the field, and a disabled field is not validated.
      maxMark: [null as number | null, [Validators.required, maxMarkValidator]],
    });

    // Clearing a field starts it over (its error waits for leaving it again).
    restartWhenCleared(
      [row.controls.nameAr, row.controls.nameEn, row.controls.weight, row.controls.maxMark],
      this.destroyRef
    );

    // A weight can never take the total above 100: it is cut down to what is left.
    row.controls.weight.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(weight => this.limitWeight(row, weight));

    // An open component has no max mark: the field is cleared and disabled.
    row.controls.isOpen.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isOpen => {

        if (isOpen) {
          row.controls.maxMark.setValue(null);
          row.controls.maxMark.disable();
        } else {
          row.controls.maxMark.enable();
        }
      });

    return row;
  }


  // A new row, with the focus in its Arabic name.
  addComponent(): void {
    this.components.push(this.createComponentRow());
    this.components.markAsDirty();

    const index = this.components.length - 1;

    setTimeout(() => document.getElementById(`pf-nameAr-${index}`)?.focus());
  }

  removeComponent(index: number): void {
    this.components.removeAt(index);
    this.components.markAsDirty();

    // Removing a row frees weight, so the message is no longer true.
    this.weightCapped.set(false);
  }


  // =========================
  // Weights (total at most 100)
  // =========================

  // The most a row can take: 100 minus the weights of the other rows.
  private allowedWeight(row: ComponentRow): number {

    const others = this.components.controls
      .filter(r => r !== row)
      .map(r => r.controls.weight.value);

    const allowed = FULL_WEIGHT - totalWeight(others);

    return Math.max(Math.round(allowed * 100) / 100, 0);
  }


  // Called on every valueChanges of a weight field.
  // A value above what is left is replaced by what is left
  // (or emptied when nothing is left), and the message is shown.
  private limitWeight(row: ComponentRow, weight: number | null): void {

    const current = (weight as unknown) === '' ? null : weight;

    // Only a real change of this row's weight counts. The same value comes back
    // without the user changing anything:
    //  - on "change" when the user leaves the field (a number input sends its
    //    value on "input" while typing, then again on "change");
    //  - when the [max] of an input changes: Angular checks the field again.
    // Those must not hide the message.
    if (this.lastWeights.has(row) && this.lastWeights.get(row) === current) {
      return;
    }

    if (current === null) {
      this.lastWeights.set(row, null);
      this.weightCapped.set(false);
      return;
    }

    const allowed = this.allowedWeight(row);

    if (Number(current) <= allowed) {
      this.lastWeights.set(row, current);
      this.weightCapped.set(false);
      return;
    }

    const value = allowed > 0 ? allowed : null;

    // emitEvent: false = this change does not call limitWeight again.
    // The bar is still updated, because the form array emits after it.
    row.controls.weight.setValue(value, { emitEvent: false });
    row.controls.weight.markAsTouched();

    this.lastWeights.set(row, value);
    this.weightCapped.set(true);
  }


  // The "max" of a weight input, so its arrows stop at what is left.
  maxWeight(index: number): number {

    const weights = this.weights();
    const others = this.total() - (weights[index] ?? 0);

    return Math.max(Math.round((FULL_WEIGHT - others) * 100) / 100, 0);
  }


  private updateWeights(): void {
    this.weights.set(
      this.components.getRawValue().map(r => Number(r.weight) || 0)
    );
  }


  // =========================
  // Helpers
  // =========================

  getSubjectName(subject: SubjectDto): string {
    return this.language.currentDirection() === 'rtl'
      ? subject.subjectAr
      : subject.subjectEn;
  }

  // Wrong characters at once, other errors on leaving the field,
  // an empty field after pressing the button (see showFieldError()).
  isInvalid(control: AbstractControl): boolean {
    return showFieldError(control, this.submitAttempted());
  }

  // Fields that are still wrong (the subject, the passing mark,
  // and every field of every component).
  private countInvalid(): number {

    const top = [this.planForm.controls.subjectId, this.planForm.controls.passingMark]
      .filter(control => control.invalid)
      .length;

    const rows = this.components.controls
      .flatMap(row => Object.values(row.controls))
      .filter(control => control.invalid)
      .length;

    return top + rows;
  }


  // =========================
  // Save
  // =========================

  onSubmit(): void {

    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      focusFirstInvalid(this.host);
      return;
    }

    const value = this.planForm.getRawValue();

    const components = value.components.map((row, index) => ({
      nameAr: (row.nameAr ?? '').trim(),
      nameEn: (row.nameEn ?? '').trim(),
      weight: Number(row.weight),
      teacherAddsAssessments: !!row.isOpen,
      maxMark: row.isOpen ? null : Number(row.maxMark),
      order: index + 1,
    }));

    this.isSubmitting.set(true);

    this.plansService
      .createPlan({
        academicTermId: this.data.academicTermId,
        classId: this.data.classId,
        subjectId: value.subjectId as number,
        passingMark: Number(value.passingMark),
        components,
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

          this.dialogRef.close(response.data);

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to create subject plan:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }

}