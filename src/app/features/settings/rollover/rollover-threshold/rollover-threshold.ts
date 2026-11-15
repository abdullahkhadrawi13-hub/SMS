import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { SchoolSettingsService } from '../../../../core/services/school-settings';
import { ActionResult } from '../../../../shared/services/action-result';

import {
  ConfirmDialog,
  ConfirmDialogData
} from '../../../../shared/components/confirm-dialog/confirm-dialog';


// The limits of the setting (API Reference, section 12).
const MIN_VALUE = 1;
const MAX_VALUE = 50;


// Step 1 (new year only): the rule behind the "Repeat" suggestion,
// "Repeat is suggested for students who failed N subjects or more".
// Shows the rule as a card; "Edit rule" turns the card into a small editor
// (navy & gold, 15 Nov 2026). While the editor is open the page keeps
// "Next" disabled (editingChange), so "Save" is the one primary button.
// Saving calls PUT /api/schoolsettings/promotion itself, then tells the
// page (saved), which loads the preview again with the new suggestions.
// If the Admin already changed decisions by hand, the shared ConfirmDialog
// asks first, because the new preview puts every decision back to its
// suggestion.
@Component({
  selector: 'app-rollover-threshold',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './rollover-threshold.html',
  styleUrl: './rollover-threshold.css',
})
export class RolloverThreshold {

  private readonly schoolSettingsService = inject(SchoolSettingsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly dialog = inject(MatDialog);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);


  // The saved value (failedSubjectsToRepeat of the preview).
  readonly value = input.required<number>();

  // How many decisions the Admin changed by hand in this preview.
  readonly changedCount = input(0);

  // The preview is loading, or the rollover is running.
  readonly disabled = input(false);

  // The new value, once the backend saved it.
  readonly saved = output<number>();

  // The editor opened (true) or closed (false).
  readonly editingChange = output<boolean>();

  private readonly numberInput =
    viewChild<ElementRef<HTMLInputElement>>('numberInput');


  readonly minValue = MIN_VALUE;
  readonly maxValue = MAX_VALUE;

  readonly isEditing = signal(false);

  readonly isSaving = signal(false);

  // The value in the editor (null = the field is empty).
  readonly draft = signal<number | null>(null);


  readonly isValid = computed(() => {
    const draft = this.draft();

    return draft !== null
      && Number.isInteger(draft)
      && draft >= MIN_VALUE
      && draft <= MAX_VALUE;
  });

  readonly canSave = computed(() =>
    this.isValid()
    && this.draft() !== this.value()
    && !this.isSaving()
    && !this.disabled()
  );


  // =========================
  // Editor
  // =========================

  startEdit(): void {
    this.draft.set(this.value());
    this.setEditing(true);

    // The cursor goes to the number once the editor is shown.
    afterNextRender(
      () => this.numberInput()?.nativeElement.select(),
      { injector: this.injector }
    );
  }

  cancel(): void {
    if (this.isSaving()) {
      return;
    }

    this.setEditing(false);
  }

  private setEditing(editing: boolean): void {
    this.isEditing.set(editing);
    this.editingChange.emit(editing);
  }

  decrease(): void {
    const draft = this.draft() ?? MIN_VALUE;

    this.draft.set(Math.max(MIN_VALUE, Math.floor(draft) - 1));
  }

  increase(): void {
    const draft = this.draft() ?? MIN_VALUE - 1;

    this.draft.set(Math.min(MAX_VALUE, Math.floor(draft) + 1));
  }

  onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;

    this.draft.set(text === '' ? null : Number(text));
  }

  // Enter saves, Escape closes the editor.
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.save();
    }

    if (event.key === 'Escape') {
      this.cancel();
    }
  }


  // =========================
  // Save
  // =========================

  save(): void {
    if (!this.canSave()) {
      return;
    }

    const changedCount = this.changedCount();

    if (changedCount === 0) {
      this.submit();
      return;
    }

    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data: {
          icon: 'warning',
          titleKey: 'ROLLOVER.THRESHOLD.DIALOG.TITLE',
          messageKey: changedCount === 1
            ? 'ROLLOVER.THRESHOLD.DIALOG.MESSAGE_ONE'
            : 'ROLLOVER.THRESHOLD.DIALOG.MESSAGE_MANY',
          messageParams: { count: changedCount },
          confirmKey: 'ROLLOVER.THRESHOLD.DIALOG.CONFIRM',
          tone: 'warn'
        }
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.submit();
        }
      });
  }

  // PUT /api/schoolsettings/promotion
  private submit(): void {
    const draft = this.draft();

    if (draft === null) {
      return;
    }

    this.isSaving.set(true);

    this.schoolSettingsService
      .updatePromotion(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.isSaving.set(false);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.setEditing(false);

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );

          this.saved.emit(response.data?.failedSubjectsToRepeat ?? draft);
        },

        error: (error: HttpErrorResponse) => {

          this.isSaving.set(false);

          // 401: the interceptor already logged the Admin out.
          if (error.status === 401) {
            return;
          }

          console.error('Failed to save the rollover setting:', error);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }
}
