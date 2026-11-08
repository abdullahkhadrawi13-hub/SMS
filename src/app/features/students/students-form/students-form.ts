import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { catchError, filter, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

import {
  LOGIN_ID_MAX_LENGTH,
  USER_NAME_MAX_LENGTH
} from '../../../shared/constants/field-lengths';
import {
  generateTempPassword,
  TEMP_PASSWORD_MAX_LENGTH
} from '../../../shared/utils/temp-password';

import { SchoolClassesService } from '../../../core/services/school-classes';
import { SectionsService } from '../../../core/services/sections';
import { Students } from '../../../core/services/students';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { ActionResult } from '../../../shared/services/action-result';

import { SchoolClassSimpleDto } from '../../../core/models/school-class';
import { ActiveSectionDto } from '../../../core/models/section';
import {
  CreateStudentRequest,
  Student,
  StudentRequest,
  StudentStatus
} from '../../../core/models/student';

import { StateCard } from '../../../shared/components/state-card/state-card';
import { StudentStatusBadge } from '../../../shared/components/student-status/student-status';
import {
  PlanConfirmData,
  PlanConfirmDialog
} from '../../subjects/subject-plans/plan-confirm-dialog/plan-confirm-dialog';


export interface StudentFormDialogData {
  studentId?: number;
}


// The name of one of the form's controls.
type FieldName = keyof StudentsForm['studentForm']['controls'];


// Arabic name parts: Arabic letters, spaces, dots and hyphens.
const ARABIC_NAME = /^[؀-ۿ\s.-]+$/;

// English name parts: English letters, spaces, dots and hyphens.
const ENGLISH_NAME = /^[A-Za-z\s.-]+$/;


// The four parts of a name, in order. Used by the template to draw
// the Arabic row and the English row with the same labels.
type NamePart = 'firstName' | 'fatherName' | 'grandFatherName' | 'familyName';

const NAME_PARTS: { part: NamePart; labelKey: string }[] = [
  { part: 'firstName',       labelKey: 'STUDENTS_FORM.NAME.FIRST' },
  { part: 'fatherName',      labelKey: 'STUDENTS_FORM.NAME.FATHER' },
  { part: 'grandFatherName', labelKey: 'STUDENTS_FORM.NAME.GRAND_FATHER' },
  { part: 'familyName',      labelKey: 'STUDENTS_FORM.NAME.FAMILY' },
];


// Add / edit student dialog (navy & gold, week 3).
// Plan: claude/SMS-Students-Form-Plan.md (8 Nov 2026).
//
//   - fixed header (title, one line, ✕), the body scrolls, fixed footer
//   - fields use the shared look in styles.css (.field, .field-box…)
//   - closing with unsaved changes asks "Discard changes?" first
//     (backdrop click, Esc, ✕ and Cancel)
//   - saving with errors: every field is marked, the first wrong field
//     gets the focus, and the footer says how many need fixing
//   - after saving: the backend message in action-result-dialog, then close
//
// The dialog is opened by students-page with panelClass 'form-dialog'
// (full screen on the phone, see styles.css).
@Component({
  selector: 'app-student-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    StateCard,
    StudentStatusBadge,
  ],
  templateUrl: './students-form.html',
  styleUrl: './students-form.css'
})
export class StudentsForm {

  // Max lengths for the inputs (same limits as the backend).
  readonly nameMaxLength = USER_NAME_MAX_LENGTH;
  readonly loginIdMaxLength = LOGIN_ID_MAX_LENGTH;
  readonly passwordMaxLength = TEMP_PASSWORD_MAX_LENGTH;

  readonly nameParts = NAME_PARTS;
  readonly graduatedStatus = StudentStatus.Graduated;

  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<StudentsForm>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);

  private readonly studentsService = inject(Students);
  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);

  private readonly dialogData =
    inject<StudentFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  // The direction is set once on <html> by the Language service;
  // here we only need to know which name to show (Arabic or English).
  readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly studentId = signal<number | null>(
    this.dialogData?.studentId ?? null
  );

  readonly isEditMode = signal(!!this.dialogData?.studentId);

  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<ActiveSectionDto[]>([]);

  // The class chosen in the form (0 = none). Kept as a signal so the
  // section placeholder can say why the section list is empty.
  readonly selectedClassId = signal(0);

  readonly isLoadingClasses = signal(false);
  readonly isLoadingSections = signal(false);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);

  // Loading the student failed (edit): shown in a state card with Retry.
  readonly loadError = signal('');

  // A problem found before sending (invalid id): shown above the footer.
  readonly errorMessage = signal('');

  // The student as it came from GET (edit mode).
  readonly student = signal<Student | null>(null);

  // Graduated (API Reference, section 4): the class and section are the
  // ones the student graduated from and cannot be changed.
  readonly isGraduated = computed(
    () => this.student()?.studentStatus === StudentStatus.Graduated
  );

  // Edit header line: the student's name in the UI language · number.
  readonly studentName = computed(() => {
    const s = this.student();

    if (!s) {
      return '';
    }

    return this.isArabic()
      ? `${s.firstNameAr} ${s.fatherNameAr} ${s.grandFatherNameAr} ${s.familyNameAr}`
      : `${s.firstNameEn} ${s.fatherNameEn} ${s.grandFatherNameEn} ${s.familyNameEn}`;
  });

  readonly graduatedClassName = computed(() => {
    const s = this.student();

    return (s && (this.isArabic() ? s.classNameAr : s.classNameEn)) || '—';
  });

  readonly graduatedSectionName = computed(() => {
    const s = this.student();

    return (s && (this.isArabic() ? s.sectionAr : s.sectionEn)) || '—';
  });

  // What the disabled / empty section list says.
  readonly sectionPlaceholderKey = computed(() => {
    if (this.selectedClassId() < 1) {
      return 'STUDENTS_FORM.PLACEMENT.SECTION_FIRST';
    }

    if (this.isLoadingSections()) {
      return 'STUDENTS_FORM.PLACEMENT.LOADING_SECTIONS';
    }

    if (this.sections().length === 0) {
      return 'STUDENTS_FORM.PLACEMENT.NO_SECTIONS';
    }

    return 'STUDENTS_FORM.PLACEMENT.SELECT_SECTION';
  });

  // "N fields need fixing" next to the buttons, after a save with errors.
  readonly submitAttempted = signal(false);
  readonly invalidCount = signal(0);

  readonly invalidCountKey = computed(() => {
    const count = this.invalidCount();

    if (count === 1) return 'STUDENTS_FORM.ERRORS_COUNT.ONE';
    if (count === 2) return 'STUDENTS_FORM.ERRORS_COUNT.TWO';
    if (count <= 10) return 'STUDENTS_FORM.ERRORS_COUNT.FEW';

    return 'STUDENTS_FORM.ERRORS_COUNT.MANY';
  });

  // The discard question is open (so a second Esc does not open another).
  private isConfirmingClose = false;


  readonly studentForm = this.fb.nonNullable.group({
    firstNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ARABIC_NAME)]],
    fatherNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ARABIC_NAME)]],
    grandFatherNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ARABIC_NAME)]],
    familyNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ARABIC_NAME)]],

    firstNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ENGLISH_NAME)]],
    fatherNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ENGLISH_NAME)]],
    grandFatherNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ENGLISH_NAME)]],
    familyNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ENGLISH_NAME)]],

    loginId: ['', [Validators.required, Validators.minLength(3)]],

    temporaryPassword: ['', [Validators.required, Validators.minLength(8)]],

    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],

    classId: [0, [Validators.required, Validators.min(1)]],

    sectionId: [0, [Validators.required, Validators.min(1)]]
  });


  constructor() {
    this.setUpClosing();

    // The section stays disabled until a class is chosen.
    this.studentForm.controls.sectionId.disable();

    this.loadClasses();

    // A new class: clear the section and load that class's sections.
    this.studentForm.controls.classId.valueChanges
      .pipe(
        tap(classId => {
          this.selectedClassId.set(classId);
          this.sections.set([]);

          this.studentForm.controls.sectionId.reset(0, { emitEvent: false });
          this.studentForm.controls.sectionId.disable({ emitEvent: false });
        }),
        switchMap(classId => this.fetchSections(classId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(sections => this.applySections(sections));

    // Keep the error count up to date while the user fixes the fields.
    this.studentForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidCount.set(this.countInvalid()));

    if (this.isEditMode()) {
      this.studentForm.controls.temporaryPassword.clearValidators();
      this.studentForm.controls.temporaryPassword.updateValueAndValidity();

      this.loadStudent();
    }
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
    if (this.isSubmitting() || this.isConfirmingClose) {
      return;
    }

    if (!this.studentForm.dirty) {
      this.dialogRef.close();
      return;
    }

    this.isConfirmingClose = true;

    this.dialog
      .open<PlanConfirmDialog, PlanConfirmData, boolean>(PlanConfirmDialog, {
        maxWidth: '95vw',
        data: {
          icon: 'edit_note',
          titleKey: 'STUDENTS_FORM.DISCARD.TITLE',
          messageKey: 'STUDENTS_FORM.DISCARD.MESSAGE',
          confirmKey: 'STUDENTS_FORM.DISCARD.CONFIRM',
          tone: 'danger',
        },
      })
      .afterClosed()
      .subscribe(confirmed => {
        this.isConfirmingClose = false;

        if (confirmed === true) {
          this.dialogRef.close();
        }
      });
  }


  // =========================
  // Classes and sections
  // =========================

  private loadClasses(): void {
    this.isLoadingClasses.set(true);

    this.classesService
      .getActiveSchoolClasses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.classes.set(response.success ? response.data : []);
          this.isLoadingClasses.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load classes:', error);
          this.classes.set([]);
          this.isLoadingClasses.set(false);
        }
      });
  }


  // The class's active sections, or [] when no class is chosen.
  private fetchSections(classId: number) {
    if (!classId || classId < 1) {
      return of<ActiveSectionDto[]>([]);
    }

    this.isLoadingSections.set(true);

    return this.sectionsService.getActiveSectionsByClass(classId).pipe(
      switchMap(response => of(response.success ? response.data : [])),

      catchError((error: HttpErrorResponse) => {
        console.error('Failed to load sections:', error);
        return of<ActiveSectionDto[]>([]);
      })
    );
  }


  private applySections(sections: ActiveSectionDto[]): void {
    this.sections.set(sections);
    this.isLoadingSections.set(false);

    if (sections.length > 0) {
      this.studentForm.controls.sectionId.enable({ emitEvent: false });
    }
  }


  getClassName(c: SchoolClassSimpleDto): string {
    return this.isArabic() ? c.classNameAr : c.classNameEn;
  }


  getSectionName(s: ActiveSectionDto): string {
    return this.isArabic() ? s.sectionAr : s.sectionEn;
  }


  // =========================
  // Edit: load the student
  // =========================

  loadStudent(): void {
    const id = this.studentId();

    if (!id) {
      return;
    }

    this.isLoading.set(true);
    this.loadError.set('');

    this.studentsService
      .getStudent(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.loadError.set(
              this.apiMessageService.getMessage(response) ||
              'STUDENTS_FORM.ERROR.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          const student = response.data;

          this.student.set(student);
          this.selectedClassId.set(student.classId);

          // emitEvent: false so the saved class does not clear the section.
          this.studentForm.patchValue({
            firstNameAr: student.firstNameAr,
            fatherNameAr: student.fatherNameAr,
            grandFatherNameAr: student.grandFatherNameAr,
            familyNameAr: student.familyNameAr,

            firstNameEn: student.firstNameEn,
            fatherNameEn: student.fatherNameEn,
            grandFatherNameEn: student.grandFatherNameEn,
            familyNameEn: student.familyNameEn,

            loginId: student.loginId,
            phoneNumber: student.phoneNumber,

            classId: student.classId
          }, {
            emitEvent: false
          });

          this.isLoading.set(false);

          // Graduated: the class and section are locked (sent back as they came).
          if (student.studentStatus === StudentStatus.Graduated) {
            this.lockGraduatedPlacement(student);
            return;
          }

          // Load the class's sections, then select the student's section.
          this.fetchSections(student.classId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(sections => {
              this.applySections(sections);

              this.studentForm.controls.sectionId.setValue(student.sectionId, {
                emitEvent: false
              });
            });
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load student:', error);

          this.loadError.set('STUDENTS_FORM.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        }
      });
  }


  // A graduated student: the class and section cannot change (else 400).
  // Both controls keep the ids from the GET and are disabled, so the user
  // cannot change them; getRawValue() still sends them back unchanged.
  // Their names come with the student, so the sections are not loaded
  // (the graduation class or section may not even be active any more).
  private lockGraduatedPlacement(student: Student): void {
    this.studentForm.controls.sectionId.setValue(student.sectionId, {
      emitEvent: false
    });

    this.studentForm.controls.classId.disable({ emitEvent: false });
    this.studentForm.controls.sectionId.disable({ emitEvent: false });
  }


  // =========================
  // Temporary password (add only)
  // =========================

  // Fills the field with a password like Abc-4def-g7 (11 characters,
  // backend: 8 to 100, no other rules). The field stays editable by hand.
  generatePassword(): void {
    const control = this.studentForm.controls.temporaryPassword;

    control.setValue(generateTempPassword());
    control.markAsDirty();
    control.markAsTouched();
  }


  // =========================
  // Save
  // =========================

  onSubmit(): void {
    // The button keeps its colour while saving, so guard here instead.
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');

    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();

      this.submitAttempted.set(true);
      this.invalidCount.set(this.countInvalid());

      this.focusFirstInvalid();
      return;
    }

    this.isSubmitting.set(true);

    if (this.isEditMode()) {
      this.updateStudent();
    } else {
      this.createStudent();
    }
  }


  private createStudent(): void {
    const formValue = this.studentForm.getRawValue();

    const data: CreateStudentRequest = {
      firstNameAr: formValue.firstNameAr,
      fatherNameAr: formValue.fatherNameAr,
      grandFatherNameAr: formValue.grandFatherNameAr,
      familyNameAr: formValue.familyNameAr,

      firstNameEn: formValue.firstNameEn,
      fatherNameEn: formValue.fatherNameEn,
      grandFatherNameEn: formValue.grandFatherNameEn,
      familyNameEn: formValue.familyNameEn,

      loginId: formValue.loginId,
      temporaryPassword: formValue.temporaryPassword,

      phoneNumber: formValue.phoneNumber,

      classId: formValue.classId,
      sectionId: formValue.sectionId
    };

    this.studentsService
      .createStudent(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          this.dialogRef.close({ success: true, action: 'created' });

          this.actionResult.show('success', this.apiMessageService.getMessage(response));
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to create student:', error);

          this.isSubmitting.set(false);

          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        }
      });
  }


  private updateStudent(): void {
    const id = this.studentId();

    if (!id) {
      this.errorMessage.set('STUDENTS_FORM.ERROR.INVALID_ID');
      this.isSubmitting.set(false);
      return;
    }

    const formValue = this.studentForm.getRawValue();

    const data: StudentRequest = {
      firstNameAr: formValue.firstNameAr,
      fatherNameAr: formValue.fatherNameAr,
      grandFatherNameAr: formValue.grandFatherNameAr,
      familyNameAr: formValue.familyNameAr,

      firstNameEn: formValue.firstNameEn,
      fatherNameEn: formValue.fatherNameEn,
      grandFatherNameEn: formValue.grandFatherNameEn,
      familyNameEn: formValue.familyNameEn,

      loginId: formValue.loginId,
      phoneNumber: formValue.phoneNumber,

      classId: formValue.classId,
      sectionId: formValue.sectionId
    };

    this.studentsService
      .updateStudent(id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.isSubmitting.set(false);

          if (!response.success) {
            this.actionResult.show('error', this.apiMessageService.getMessage(response));
            return;
          }

          this.dialogRef.close({ success: true, action: 'updated' });

          this.actionResult.show('success', this.apiMessageService.getMessage(response));
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to update student:', error);

          this.isSubmitting.set(false);

          this.actionResult.show('error', this.apiMessageService.getErrorMessage(error));
        }
      });
  }


  // =========================
  // Errors
  // =========================

  // Enabled fields that are still wrong (a disabled field is never invalid).
  private countInvalid(): number {
    return Object.values(this.studentForm.controls)
      .filter(control => control.invalid)
      .length;
  }


  // The first wrong field in the order it is shown, so the user starts there.
  private focusFirstInvalid(): void {
    const field = this.host.nativeElement.querySelector<HTMLElement>(
      'input.ng-invalid, select.ng-invalid'
    );

    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }


  isFieldInvalid(fieldName: FieldName): boolean {
    const control = this.studentForm.controls[fieldName];

    return control.invalid && control.touched;
  }


  // The id of a field's error line, for aria-describedby.
  describedBy(fieldName: string, hasHelp = false): string | null {
    if (this.isFieldInvalid(fieldName as FieldName)) {
      return `sf-${fieldName}-error`;
    }

    return hasHelp ? `sf-${fieldName}-help` : null;
  }


  // Name rows: the form control of a name part in one language.
  nameControl(part: NamePart, lang: 'Ar' | 'En'): FieldName {
    return `${part}${lang}` as FieldName;
  }
}
