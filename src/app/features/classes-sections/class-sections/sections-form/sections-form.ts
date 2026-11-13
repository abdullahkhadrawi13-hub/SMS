import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { filter, map, Observable, of, tap } from 'rxjs';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../../core/models/school-class';
import { Section } from '../../../../core/models/section';
import { SectionsService } from '../../../../core/services/sections';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { ActionResult } from '../../../../shared/services/action-result';
import { requiredTextValidator } from '../../../../shared/utils/form-validators';

import {
  ConfirmDialogData,
  ConfirmDialog
} from '../../../../shared/components/confirm-dialog/confirm-dialog';


// Data passed to the dialog.
// The class is the page's class (shown locked: a section never moves
// to another class). No section = add mode, a section = edit mode.
export interface SectionFormData {
  schoolClass: SchoolClass;
  section: Section | null;
}

// Value returned when the dialog closes after a successful save.
export interface SectionFormResult {
  success: true;
  action: 'created' | 'updated';
}


// The longest section name (the same limit as the backend).
const SECTION_NAME_MAX_LENGTH = 100;

// Arabic letters, digits, spaces, dots and dashes (e.g. "أ", "الشعبة 1").
const ARABIC_SECTION_NAME = /^[؀-ۿ0-9\s.-]+$/;

// English letters, digits, spaces, dots and dashes (e.g. "A", "Section 1").
const ENGLISH_SECTION_NAME = /^[A-Za-z0-9\s.-]+$/;


// The name of one of the form's controls.
type FieldName = 'sectionAr' | 'sectionEn';


// Add / edit section dialog (navy & gold, 12 Nov 2026).
// It works like the class form next to it:
//
//   - fixed header (title, one line, ✕), the body, fixed footer
//   - the layout and the fields use the shared look in styles.css
//     (.fd, .fd-head, .fd-body… and .field, .field-box…)
//   - the class is shown locked (read-only field with a lock icon)
//   - closing with unsaved changes asks "Discard changes?" first
//     (backdrop click, Esc, ✕ and Cancel)
//   - saving with errors: every field is marked, the first wrong field
//     gets the focus, and the footer says how many need fixing
//   - the form sends the request itself, and closes only after a
//     successful save (the backend message shows in action-result-dialog)
//
// It is opened by class-sections-page with panelClass 'form-dialog'
// (full screen on the phone, see styles.css).
@Component({
  selector: 'app-sections-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './sections-form.html',
  styleUrl: './sections-form.css',
  host: {
    // The shared form dialog layout in styles.css (.fd, .fd-head, .fd-body…)
    class: 'fd'
  }
})
export class SectionsForm {

  readonly nameMaxLength = SECTION_NAME_MAX_LENGTH;

  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialog = inject(MatDialog);

  private readonly dialogRef =
    inject(MatDialogRef<SectionsForm, SectionFormResult>);

  private readonly sectionsService = inject(SectionsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<SectionFormData>(MAT_DIALOG_DATA);

  // True when the form edits an existing section.
  readonly isEditMode = !!this.data.section;

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // The (locked) class name in the UI language.
  readonly className = computed(() =>
    this.isArabic()
      ? this.data.schoolClass.classNameAr
      : this.data.schoolClass.classNameEn
  );

  // Edit header line: the section name in the UI language.
  readonly sectionName = computed(() => {
    const section = this.data.section;

    if (!section) {
      return '';
    }

    return this.isArabic() ? section.sectionAr : section.sectionEn;
  });

  // True while the request is being sent (prevents a double submit).
  readonly isSubmitting = signal(false);

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);

  readonly invalidCountKey = computed(() =>
    this.invalidCount() === 1
      ? 'CLASS_SECTIONS.FORM.ERRORS_COUNT.ONE'
      : 'CLASS_SECTIONS.FORM.ERRORS_COUNT.TWO'
  );

  // The discard question is open (so a second Esc does not open another).
  private isConfirmingClose = false;


  readonly sectionForm = this.fb.nonNullable.group({

    sectionAr: [
      this.data.section?.sectionAr ?? '',
      [
        requiredTextValidator,
        Validators.maxLength(SECTION_NAME_MAX_LENGTH),
        Validators.pattern(ARABIC_SECTION_NAME)
      ]
    ],

    sectionEn: [
      this.data.section?.sectionEn ?? '',
      [
        requiredTextValidator,
        Validators.maxLength(SECTION_NAME_MAX_LENGTH),
        Validators.pattern(ENGLISH_SECTION_NAME)
      ]
    ]

  });


  constructor() {
    this.setUpClosing();

    // Keep the error count up to date while the user fixes the fields.
    this.sectionForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));
  }


  // =========================
  // Closing
  // =========================

  // Backdrop click and Esc do not close the dialog by themselves:
  // they go through requestClose(), which asks first when something changed.
  private setUpClosing(): void {
    this.dialogRef.disableClose = true;

    this.dialogRef
      .backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.requestClose());

    this.dialogRef
      .keydownEvents()
      .pipe(
        filter(event => event.key === 'Escape'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        event.preventDefault();
        this.requestClose();
      });
  }


  // ✕, Cancel, backdrop click and Esc.
  requestClose(): void {
    this.confirmDiscard().subscribe(canClose => {
      if (canClose) {
        this.dialogRef.close();
      }
    });
  }


  // May the form close now?
  //   - true straight away when nothing was changed
  //   - otherwise asks "Discard changes?": true on "Discard changes"
  //   - false while saving, or while the question is already open
  private confirmDiscard(): Observable<boolean> {
    if (this.isSubmitting() || this.isConfirmingClose) {
      return of(false);
    }

    if (!this.sectionForm.dirty) {
      return of(true);
    }

    this.isConfirmingClose = true;

    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        maxWidth: '95vw',
        data: {
          icon: 'edit_note',
          titleKey: 'CLASS_SECTIONS.FORM.DISCARD.TITLE',
          messageKey: 'CLASS_SECTIONS.FORM.DISCARD.MESSAGE',
          confirmKey: 'CLASS_SECTIONS.FORM.DISCARD.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .pipe(
        tap(() => (this.isConfirmingClose = false)),
        map(confirmed => confirmed === true)
      );
  }


  // =========================
  // Save
  // =========================

  // POST /api/sections (add) or PUT /api/sections/{id} (edit: names only).
  submit(): void {
    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      this.focusFirstInvalid();
      return;
    }

    const formValue = this.sectionForm.getRawValue();

    // Names are sent without spaces at the start and end.
    const names = {
      sectionAr: formValue.sectionAr.trim(),
      sectionEn: formValue.sectionEn.trim()
    };

    const section = this.data.section;

    const request$ = section
      ? this.sectionsService.updateSection(section.sectionId, names)
      : this.sectionsService.createSection({
          classId: this.data.schoolClass.schoolClassId,
          ...names
        });

    this.isSubmitting.set(true);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          // Business error (e.g. the name already exists in this class):
          // keep the dialog open so the user can fix the value.
          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.dialogRef.close({
            success: true,
            action: this.isEditMode ? 'updated' : 'created'
          });

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to save section:', error);

          this.isSubmitting.set(false);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }


  // =========================
  // Errors
  // =========================

  // Fields that are still wrong.
  private countInvalid(): number {
    return Object.values(this.sectionForm.controls)
      .filter(control => control.invalid)
      .length;
  }


  // The first wrong field in the order it is shown, so the user starts there.
  private focusFirstInvalid(): void {
    const field = this.host.nativeElement.querySelector<HTMLElement>(
      'input.ng-invalid'
    );

    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }


  // When a field shows its error (the same as the student form):
  //   - a wrong kind of character (English letters in the Arabic name,
  //     Arabic letters in the English one) shows at once, while typing
  //   - an empty field says "required" only after pressing Add / Save,
  //     so just moving through the fields never shows an error
  //   - after pressing the button every error shows, and each one goes
  //     away as soon as its field is fixed
  isFieldInvalid(fieldName: FieldName): boolean {
    const control = this.sectionForm.controls[fieldName];

    if (!control.invalid) {
      return false;
    }

    return this.submitAttempted() || control.hasError('pattern');
  }


  // The id of a field's error line, for aria-describedby.
  describedBy(fieldName: FieldName): string | null {
    return this.isFieldInvalid(fieldName) ? `xf-${fieldName}-error` : null;
  }

}
