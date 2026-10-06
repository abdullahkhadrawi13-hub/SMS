import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { SchoolClassesService } from '../../../core/services/school-classes';
import {
  SectionSimpleDto,
  SectionsService
} from '../../../core/services/sections';
import {
  AcademicYear,
  AcademicYearsService
} from '../../../core/services/academic-years';
import {
  AcademicTerm,
  AcademicTermsService
} from '../../../core/services/academic-terms';
import { SchoolClassSimpleDto } from '../../classes/school-class';

export interface SectionFilterData {
  classId?: number;
  sectionId?: number;
  academicYearId?: number;
  academicTermId?: number;
}

@Component({
  selector: 'app-section-filter',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './section-filter.html',
  styleUrl: './section-filter.css'
})
export class SectionFilter {

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef =
    inject(MatDialogRef<SectionFilter>);

  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);
  private readonly academicYearsService = inject(AcademicYearsService);
  private readonly academicTermsService = inject(AcademicTermsService);

  readonly data: SectionFilterData =
    inject<SectionFilterData>(MAT_DIALOG_DATA, { optional: true })
    ?? {};

  // Lists
  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<SectionSimpleDto[]>([]);
  readonly academicYears = signal<AcademicYear[]>([]);
  readonly academicTerms = signal<AcademicTerm[]>([]);

  readonly filterForm = this.fb.group({

    classId: [
      this.data.classId ?? null
    ],

    sectionId: [
      this.data.sectionId ?? null
    ],

    academicYearId: [
      this.data.academicYearId ?? null
    ],

    academicTermId: [
      this.data.academicTermId ?? null
    ]

  });

  constructor() {

    // Sections and Terms are disabled until their parent is chosen
    this.filterForm.controls.sectionId.disable({ emitEvent: false });
    this.filterForm.controls.academicTermId.disable({ emitEvent: false });

    this.loadClasses();
    this.loadAcademicYears();

    // Restore the previous filter when the dialog is reopened
    if (this.data.classId) {
      this.loadSections(
        this.data.classId,
        this.data.sectionId ?? null
      );
    }

    if (this.data.academicYearId) {
      this.loadAcademicTerms(
        this.data.academicYearId,
        this.data.academicTermId ?? null
      );
    }

    // Cascading: Class -> Sections
    this.filterForm.controls.classId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(classId => this.onClassChange(classId));

    // Cascading: Academic Year -> Academic Terms
    this.filterForm.controls.academicYearId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(yearId => this.onAcademicYearChange(yearId));
  }

  // Active classes only
  private loadClasses(): void {

    this.classesService
      .getActiveSchoolClasses()
      .pipe(
        catchError(error => {
          console.error('Failed to load classes:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(response => {
        this.classes.set(response?.success ? response.data : []);
      });
  }

  private loadAcademicYears(): void {

    this.academicYearsService
      .getAcademicYears()
      .pipe(
        catchError(error => {
          console.error('Failed to load academic years:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(response => {
        this.academicYears.set(response?.success ? response.data : []);
      });
  }

  // Sections of the selected class only
  private loadSections(
    classId: number,
    selectedSectionId: number | null = null
  ): void {

    const sectionControl = this.filterForm.controls.sectionId;

    // Keep it disabled while loading
    sectionControl.disable({ emitEvent: false });

    this.sectionsService
      .getSectionsByClass(classId)
      .pipe(
        catchError(error => {
          console.error('Failed to load sections:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(response => {

        // Ignore the response if the class changed while loading
        if (this.filterForm.controls.classId.value !== classId) {
          return;
        }

        const sections = response?.success ? response.data : [];
        this.sections.set(sections);

        sectionControl.setValue(
          sections.some(s => s.sectionId === selectedSectionId)
            ? selectedSectionId
            : null,
          { emitEvent: false }
        );

        sectionControl.enable({ emitEvent: false });
      });
  }

  // Terms of the selected academic year only
  // (GET /api/academicterms/by-year/{academicYearId})
  private loadAcademicTerms(
    academicYearId: number,
    selectedTermId: number | null = null
  ): void {

    const termControl = this.filterForm.controls.academicTermId;

    // Keep it disabled while loading
    termControl.disable({ emitEvent: false });

    this.academicTermsService
      .getAcademicTermsByYear(academicYearId)
      .pipe(
        catchError(error => {
          console.error('Failed to load academic terms:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(response => {

        // Ignore the response if the year changed while loading
        if (
          this.filterForm.controls.academicYearId.value !== academicYearId
        ) {
          return;
        }

        const terms = response?.success ? response.data : [];
        this.academicTerms.set(terms);

        termControl.setValue(
          terms.some(t => t.academicTermId === selectedTermId)
            ? selectedTermId
            : null,
          { emitEvent: false }
        );

        termControl.enable({ emitEvent: false });
      });
  }

  private onClassChange(classId: number | null): void {

    const sectionControl = this.filterForm.controls.sectionId;

    // Always reset the section when the class changes
    sectionControl.setValue(null, { emitEvent: false });
    this.sections.set([]);

    if (classId) {
      this.loadSections(classId);
    } else {
      sectionControl.disable({ emitEvent: false });
    }
  }

  private onAcademicYearChange(academicYearId: number | null): void {

    const termControl = this.filterForm.controls.academicTermId;

    // Always reset the term when the year changes
    termControl.setValue(null, { emitEvent: false });
    this.academicTerms.set([]);

    if (academicYearId) {
      this.loadAcademicTerms(academicYearId);
    } else {
      termControl.disable({ emitEvent: false });
    }
  }

  // Display names (Arabic / English)
  getClassName(c: SchoolClassSimpleDto): string {
    return document.documentElement.lang === 'ar'
      ? c.classNameAr
      : c.classNameEn;
  }

  getSectionName(s: SectionSimpleDto): string {
    return document.documentElement.lang === 'ar'
      ? s.sectionAr
      : s.sectionEn;
  }

  getTermName(t: AcademicTerm): string {
    return document.documentElement.lang === 'ar'
      ? t.nameAr
      : t.nameEn;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  apply(): void {
    this.dialogRef.close(
      this.filterForm.getRawValue()
    );
  }

  clear(): void {
    // Emits valueChanges for classId / academicYearId, so the
    // dependent lists are emptied and disabled by the handlers above
    this.filterForm.reset({
      classId: null,
      sectionId: null,
      academicYearId: null,
      academicTermId: null
    });
  }
}