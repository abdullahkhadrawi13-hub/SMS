import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { catchError, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClassesService } from '../../../core/services/school-classes';

import {
  ActiveSectionDto,
  SectionsService
} from '../../../core/services/sections';

import {
  CreateStudentRequest,
  StudentRequest,
  Students
} from '../../../core/services/students';

import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';



import { Language } from '../../../core/services/language';

import { SchoolClassSimpleDto } from '../../classes/school-class';


export interface StudentFormDialogData {
  studentId?: number;
}


@Component({
  selector: 'app-student-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './student-form.html',
  styleUrl: './student-form.css'
})
export class StudentForm {

  private readonly fb = inject(FormBuilder);
  private readonly studentsService = inject(Students);
  private readonly dialogRef = inject(MatDialogRef<StudentForm>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);

  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);


  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);
  private readonly dialogData =
    inject<StudentFormDialogData>(MAT_DIALOG_DATA);

  readonly direction = computed(() => this.language.currentDirection());

  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<ActiveSectionDto[]>([]);

  readonly isLoadingClasses = signal(false);
  readonly isLoadingSections = signal(false);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');



  readonly studentId = signal<number | null>(
    this.dialogData?.studentId ?? null
  );

  readonly isEditMode = signal(
    !!this.dialogData?.studentId
  );

  readonly studentForm = this.fb.nonNullable.group({
    // Arabic name fields: allow Arabic letters and spaces only
    firstNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[\u0600-\u06FF\s]+$/)]],
    fatherNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[\u0600-\u06FF\s]+$/)]],
    grandFatherNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[\u0600-\u06FF\s]+$/)]],
    familyNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[\u0600-\u06FF\s]+$/)]],

    // English name fields: allow English letters and spaces only
    firstNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s]+$/)]],
    fatherNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s]+$/)]],
    grandFatherNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s]+$/)]],
    familyNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s]+$/)]],

    loginId: ['', [Validators.required, Validators.minLength(3)]],

    temporaryPassword: ['', [Validators.required, Validators.minLength(8)]],

    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]
    ],

    classId: [0, [Validators.required, Validators.min(1)]],

    sectionId: [0, [Validators.required, Validators.min(1)]]
  });


  constructor() {
    // الشعبة معطّلة حتى يتم اختيار الصف
    this.studentForm.controls.sectionId.disable();

    this.loadClasses();

    // عند تغيير الصف: تصفير الشعبة وتحميل شعب الصف الجديد
    this.studentForm.controls.classId.valueChanges
      .pipe(
        tap(() => {
          this.sections.set([]);
          this.studentForm.controls.sectionId.reset(0, {
            emitEvent: false
          });

          this.studentForm.controls.sectionId.disable({
            emitEvent: false
          });
        }),
        switchMap(classId => this.fetchSections(classId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(sections => this.applySections(sections));

    if (this.isEditMode()) {
      const id = this.studentId();

      if (id) {
        this.loadStudent(id);
      }

      this.studentForm.controls.temporaryPassword.clearValidators();
      this.studentForm.controls.temporaryPassword.updateValueAndValidity();
    }
  }


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

        error: error => {
          console.error('Failed to load classes:', error);
          this.classes.set([]);
          this.isLoadingClasses.set(false);
        }
      });
  }


  // يرجع الشعب النشطة للصف، أو [] إذا لم يُختر صف
  private fetchSections(classId: number) {
    if (!classId || classId < 1) {
      return of<ActiveSectionDto[]>([]);
    }

    this.isLoadingSections.set(true);

    return this.sectionsService.getActiveSectionsByClass(classId).pipe(
      switchMap(response =>
        of(response.success ? response.data : [])
      ),

      catchError(error => {
        console.error('Failed to load sections:', error);
        return of<ActiveSectionDto[]>([]);
      })
    );
  }


  private applySections(sections: ActiveSectionDto[]): void {
    this.sections.set(sections);
    this.isLoadingSections.set(false);

    if (sections.length > 0) {
      this.studentForm.controls.sectionId.enable({
        emitEvent: false
      });
    }
  }


  getClassName(c: SchoolClassSimpleDto): string {
    return document.documentElement.lang === 'ar'
      ? c.classNameAr
      : c.classNameEn;
  }


  getSectionName(s: ActiveSectionDto): string {
    return document.documentElement.lang === 'ar'
      ? s.sectionAr
      : s.sectionEn;
  }


  private loadStudent(studentId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.studentsService
      .getStudent(studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.errorMessage.set(
              this.apiMessageService.getMessage(response) ||
              'STUDENTS_FORM.ERROR.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          const student = response.data;

          // لا نشغّل cascading عند تحميل الصف المحفوظ
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

          // تحميل شعب الصف ثم تحديد شعبة الطالب الحالية
          this.fetchSections(student.classId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(sections => {
              this.applySections(sections);

              this.studentForm.controls.sectionId.setValue(
                student.sectionId
              );
            });
        },

        error: error => {
          console.error('Failed to load student:', error);

          this.errorMessage.set(
            'STUDENTS_FORM.ERROR.LOAD_FAILED'
          );

          this.isLoading.set(false);
        }
      });
  }


  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
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
          this.actionResult.error(
            this.apiMessageService.getMessage(response)
          );

          return;
        }

        this.dialogRef.close({
          success: true,
          action: 'created'
        });

        this.actionResult.success(
          this.apiMessageService.getMessage(response)
        );
      },

      error: error => {
        console.error('Failed to create student:', error);

        this.isSubmitting.set(false);

        this.actionResult.error(
          'STUDENTS_FORM.ERROR.CREATE_FAILED'
        );
      }
    });
}


  private updateStudent(): void {
    const id = this.studentId();

    if (!id) {
      this.errorMessage.set(
        'STUDENTS_FORM.ERROR.INVALID_ID'
      );

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
          if (!response.success) {
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );

            this.isSubmitting.set(false);
            return;
          }

          this.successMessage.set(
            'STUDENTS_FORM.SUCCESS.UPDATED'
          );

          this.isSubmitting.set(false);

          setTimeout(() => {
            this.dialogRef.close({
              success: true,
              action: 'updated'
            });
          }, 700);
        },

        error: error => {
          console.error('Failed to update student:', error);

          this.errorMessage.set(
            'STUDENTS_FORM.ERROR.UPDATE_FAILED'
          );

          this.isSubmitting.set(false);
        }
      });
  }


  cancel(): void {
    this.dialogRef.close();
  }


  isFieldInvalid(
    fieldName: keyof typeof this.studentForm.controls
  ): boolean {
    const control = this.studentForm.controls[fieldName];

    return control.invalid && control.touched;
  }
}