import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable, map } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { SchoolInfo } from '../../../../core/models/school-settings';
import { LeaveConfirmation } from '../../../../core/guards/unsaved-changes-guard';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Permissions } from '../../../../core/services/permissions';
import { SchoolSettingsService } from '../../../../core/services/school-settings';

import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SaveBar } from '../../../../shared/components/save-bar/save-bar';
import { StateCard } from '../../../../shared/components/state-card/state-card';
import { ActionResult } from '../../../../shared/services/action-result';
import { toEnglishDigits } from '../../../../shared/utils/english-digits';
import { requiredTextValidator } from '../../../../shared/utils/form-validators';
import { pluralKey } from '../../../../shared/utils/plural';

import {
  SCHOOL_ADDRESS_MAX_LENGTH,
  SCHOOL_NAME_AR,
  SCHOOL_NAME_EN,
  SCHOOL_NAME_MAX_LENGTH,
  SCHOOL_PHONE,
  SCHOOL_PHONE_MAX_LENGTH,
  SchoolInfoFormValue,
  WEEK_DAYS,
  isSameAsSaved,
  notEveryDayOffValidator,
  phoneDigitsValidator,
  toFormValue,
  toSaveRequest,
} from '../school-info';
import { DayOffChange, SchoolDaysOff } from '../school-days-off/school-days-off';


// The text fields of the form (the days off are not typed).
type TextField = 'schoolNameAr' | 'schoolNameEn' | 'phoneNumber' | 'address';


// Settings → School information (/settings/school), 22 Nov 2026.
// API Reference, section 12 (PR #51):
//   GET /api/schoolsettings/school   load (every signed-in user)
//   PUT /api/schoolsettings/school   save (Admin), every field each time
//
// One card, two sections: the name and contact details, then the weekly
// days off. Saving works like the attendance officer page: the shared
// save bar shows only while something is changed, Save sends everything,
// and the backend's message opens in the result dialog.
//
// The AssistantPrincipal opens the page read-only: a "View only" badge,
// every field disabled and no save bar.
//
// Leaving with unsaved changes asks first (unsavedChangesGuard + canLeave()),
// and closing or refreshing the tab asks the browser's question.
@Component({
  selector: 'app-school-info-page',
  imports: [
    ReactiveFormsModule,

    MatIconModule,
    TranslatePipe,

    PageHeader,
    SaveBar,
    StateCard,
    SchoolDaysOff,
  ],
  templateUrl: './school-info-page.html',
  styleUrl: './school-info-page.css',
})
export class SchoolInfoPage implements LeaveConfirmation {

  private readonly fb = inject(FormBuilder);
  private readonly schoolSettingsService = inject(SchoolSettingsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Admin: edit. AssistantPrincipal: read only.
  readonly canManage = inject(Permissions).canManageSchoolInfo;

  readonly nameMaxLength = SCHOOL_NAME_MAX_LENGTH;
  readonly phoneMaxLength = SCHOOL_PHONE_MAX_LENGTH;
  readonly addressMaxLength = SCHOOL_ADDRESS_MAX_LENGTH;


  // ===== State =====

  readonly isLoading = signal(true);

  // Error message (API message or translation key) shown instead of the page.
  readonly errorMessage = signal('');

  readonly isSaving = signal(false);

  // The information as the backend last returned it (load or save).
  readonly saved = signal<SchoolInfo | null>(null);

  // Save was pressed with something wrong: every error shows from now on.
  readonly submitAttempted = signal(false);


  // ===== Form =====

  readonly form = this.fb.nonNullable.group({
    schoolNameAr: ['', [requiredTextValidator, Validators.pattern(SCHOOL_NAME_AR)]],
    schoolNameEn: ['', [requiredTextValidator, Validators.pattern(SCHOOL_NAME_EN)]],
    phoneNumber: ['', [Validators.pattern(SCHOOL_PHONE), phoneDigitsValidator]],
    address: [''],
    weeklyDaysOff: this.fb.nonNullable.control<number[]>([], notEveryDayOffValidator),
  });

  // Every change of the form (typing, a tick, leaving a field, a reset),
  // with the disabled fields too (read-only page).
  readonly formValue = toSignal(
    this.form.events.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  readonly daysOff = computed(() => this.formValue().weeklyDaysOff);

  // Every day ticked: the error shows at once (not only after Save).
  readonly everyDayOff = computed(() => this.daysOff().length >= WEEK_DAYS.length);

  // Something differs from what is saved: the save bar shows.
  readonly hasChanges = computed(() => {
    const saved = this.saved();

    return saved !== null && !isSameAsSaved(this.formValue(), saved);
  });

  // Nothing has been saved yet (the backend starts with empty names):
  // the note at the top of the page.
  readonly isNotSaved = computed(() => {
    const saved = this.saved();

    return saved !== null && saved.schoolNameAr === '' && saved.schoolNameEn === '';
  });

  // The errors shown now, for the save bar ("Fix 2 errors before saving").
  readonly shownErrorCount = computed(() => {
    this.formValue();

    const textErrors = (Object.keys(this.form.controls) as (keyof typeof this.form.controls)[])
      .filter(name => name !== 'weeklyDaysOff' && this.isFieldInvalid(name))
      .length;

    return textErrors + (this.everyDayOff() ? 1 : 0);
  });

  // The save bar says it (and disables Save) after Save was pressed, or at
  // once when every day is ticked. Before that, Save stays pressable even
  // with a wrong character showing, so pressing it shows every error
  // (an empty name too) in one go.
  readonly saveErrorKey = computed(() => {
    const count = this.submitAttempted() || this.everyDayOff()
      ? this.shownErrorCount()
      : 0;

    return count > 0 ? pluralKey('SCHOOL_INFO.SAVE_BAR.ERRORS', count) : null;
  });

  // "العطلة: الجمعة والسبت · 5 أيام دوام".
  // The day names are joined here ("الجمعة والسبت", "Friday and Saturday"),
  // so the computed also follows a language change.
  private readonly languageChange = toSignal(this.translate.onLangChange);

  readonly daysSummary = computed(() => {
    this.languageChange();

    const days = this.daysOff();

    if (days.length === 0 || days.length >= WEEK_DAYS.length) {
      return null;
    }

    const names = days.map(day => this.translate.instant(`SCHOOL_INFO.DAYS.${day}`) as string);

    const joined = names.length === 1
      ? names[0]
      : names.slice(0, -1).join(this.translate.instant('SCHOOL_INFO.DAYS_OFF.COMMA'))
        + this.translate.instant('SCHOOL_INFO.DAYS_OFF.AND')
        + names[names.length - 1];

    const workDays = WEEK_DAYS.length - days.length;

    return {
      names: joined,
      workKey: pluralKey('SCHOOL_INFO.DAYS_OFF.WORK_DAYS', workDays),
      workDays,
    };
  });


  constructor() {
    this.restartClearedFields();
    this.load();
  }


  // =========================
  // Load
  // =========================

  // GET /api/schoolsettings/school
  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.schoolSettingsService
      .getSchoolInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.showLoadError(this.apiMessageService.getMessage(response));
            return;
          }

          this.showSaved(response.data);

          if (!this.canManage()) {
            this.form.disable();
          }

          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the school information:', error);
          this.showLoadError('SCHOOL_INFO.ERROR.LOAD_FAILED');
        },
      });
  }


  private showLoadError(message: string): void {
    this.errorMessage.set(message);
    this.isLoading.set(false);
  }


  // The form shows the saved information again, with no error showing.
  private showSaved(info: SchoolInfo): void {
    this.saved.set(info);
    this.submitAttempted.set(false);
    this.form.reset(toFormValue(info));
  }


  // =========================
  // Fields
  // =========================

  // Arabic digits become English ones while typing or pasting
  // (like the students form), so the user never sees an error for them.
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const converted = toEnglishDigits(input.value);

    if (converted === input.value) {
      return;
    }

    const cursor = input.selectionStart;

    input.value = converted;
    input.setSelectionRange(cursor, cursor);

    this.form.controls.phoneNumber.setValue(converted);
  }


  // One tile ticked or unticked. The new list starts from the control
  // itself (always up to date, even for two quick clicks in a row).
  onDayToggle(change: DayOffChange): void {
    const control = this.form.controls.weeklyDaysOff;

    const days = control.value.filter(day => day !== change.day);

    if (change.off) {
      days.push(change.day);
    }

    control.setValue(days.sort((a, b) => a - b));
    control.markAsDirty();
  }


  // When a field shows its error (the same timing as the students form):
  //   - a wrong kind of character (English letters in the Arabic name,
  //     a letter in the phone) shows at once, while typing
  //   - too few digits in the phone shows when the user leaves the field
  //   - an empty name says "required" only after pressing Save
  //   - after pressing Save every error shows until it is fixed
  isFieldInvalid(name: TextField): boolean {
    const control = this.form.controls[name];

    if (!control.invalid) {
      return false;
    }

    if (this.submitAttempted() || control.hasError('pattern')) {
      return true;
    }

    return control.touched && control.value.trim() !== '';
  }


  // The translation key of the error a field shows.
  errorKey(name: TextField): string {
    const control = this.form.controls[name];

    if (control.hasError('required')) {
      return 'SCHOOL_INFO.VALIDATION.REQUIRED';
    }

    if (name === 'schoolNameAr') {
      return 'SCHOOL_INFO.VALIDATION.ARABIC_ONLY';
    }

    if (name === 'schoolNameEn') {
      return 'SCHOOL_INFO.VALIDATION.ENGLISH_ONLY';
    }

    return 'SCHOOL_INFO.VALIDATION.PHONE';
  }


  // The id of the line under a field, for aria-describedby.
  describedBy(name: TextField, hasHelp = false): string | null {
    if (this.isFieldInvalid(name)) {
      return `si-${name}-error`;
    }

    return hasHelp ? `si-${name}-help` : null;
  }


  // Clearing a field starts it over (like the students form): it goes back
  // to "not touched", so typing again shows a length error only on leaving.
  private restartClearedFields(): void {
    for (const control of [
      this.form.controls.schoolNameAr,
      this.form.controls.schoolNameEn,
      this.form.controls.phoneNumber,
      this.form.controls.address,
    ]) {
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(value => {
          if (value.trim() === '') {
            control.markAsUntouched();
          }
        });
    }
  }


  // =========================
  // Save / Undo
  // =========================

  // PUT /api/schoolsettings/school
  save(): void {
    if (this.isSaving() || !this.canManage()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitAttempted.set(true);

      this.focusFirstInvalid();
      return;
    }

    const body = toSaveRequest(this.form.getRawValue() as SchoolInfoFormValue);

    this.isSaving.set(true);

    this.schoolSettingsService
      .updateSchoolInfo(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSaving.set(false);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          // The backend's copy: trimmed names, null for an empty address…
          this.showSaved(response.data);

          this.actionResult.show('success', this.apiMessageService.getMessage(response));
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to save the school information:', error);

          this.isSaving.set(false);

          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // Back to what is saved.
  undo(): void {
    const saved = this.saved();

    if (saved) {
      this.showSaved(saved);
    }
  }


  // The first wrong field in the order it is shown, so the user starts there.
  private focusFirstInvalid(): void {
    const field =
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')
      ?? (this.everyDayOff()
        ? this.host.nativeElement.querySelector<HTMLElement>('app-school-days-off input')
        : null);

    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }


  // =========================
  // Leaving the page
  // =========================

  canLeave(): boolean | Observable<boolean> {
    if (!this.hasChanges()) {
      return true;
    }

    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        maxWidth: '95vw',
        data: {
          icon: 'edit_note',
          titleKey: 'SCHOOL_INFO.LEAVE.TITLE',
          messageKey: 'SCHOOL_INFO.LEAVE.MESSAGE',
          confirmKey: 'SCHOOL_INFO.LEAVE.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .pipe(map(confirmed => confirmed === true));
  }


  // Closing or refreshing the tab: the browser asks its own question.
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
