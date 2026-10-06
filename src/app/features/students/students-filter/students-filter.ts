import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import { SchoolClassSimpleDto } from '../../classes/school-class';

export interface StudentFilterValues {
  classId: number | null;
  sectionId: number | null;
  isActive: boolean | null;
}

export const EMPTY_STUDENT_FILTER: StudentFilterValues = {
  classId: null,
  sectionId: null,
  isActive: null
};

@Component({
  selector: 'app-student-filter',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './students-filter.html',
  styleUrl: './students-filter.css'
})
export class StudentsFilter {

  private readonly dialogRef = inject(MatDialogRef<StudentsFilter>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);
  private readonly initial =
    inject<StudentFilterValues | null>(MAT_DIALOG_DATA, { optional: true })
    ?? EMPTY_STUDENT_FILTER;

  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<SectionSimpleDto[]>([]);

  readonly isLoadingClasses = signal(false);
  readonly isLoadingSections = signal(false);

  readonly classId = signal<number | null>(this.initial.classId);
  readonly sectionId = signal<number | null>(this.initial.sectionId);
  readonly isActive = signal<boolean | null>(this.initial.isActive);

  constructor() {
    this.loadClasses();

    // استعادة الفلتر السابق عند إعادة فتح النافذة
    if (this.initial.classId) {
      this.loadSections(this.initial.classId, this.initial.sectionId);
    }
  }

  // الصفوف النشطة فقط
  private loadClasses(): void {
    this.isLoadingClasses.set(true);

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
        this.isLoadingClasses.set(false);
      });
  }

  // شعب الصف المختار فقط
  private loadSections(classId: number, selectedSectionId: number | null = null): void {
    this.isLoadingSections.set(true);

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
        // تجاهل الرد إذا غيّر المستخدم الصف أثناء التحميل
        if (this.classId() !== classId) {
          return;
        }

        const sections = response?.success ? response.data : [];
        this.sections.set(sections);
        this.isLoadingSections.set(false);

        this.sectionId.set(
          sections.some(s => s.sectionId === selectedSectionId)
            ? selectedSectionId
            : null
        );
      });
  }

  onClassChange(classId: number | null): void {
    this.classId.set(classId);

    // تصفير الشعبة دائمًا عند تغيير الصف
    this.sectionId.set(null);
    this.sections.set([]);

    if (classId) {
      this.loadSections(classId);
    } else {
      this.isLoadingSections.set(false);
    }
  }

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

  // إعادة ضبط الفورم فقط، بدون إغلاق النافذة ولا تطبيق
  clear(): void {
    this.classId.set(null);
    this.sectionId.set(null);
    this.isActive.set(null);

    this.sections.set([]);
    this.isLoadingSections.set(false);
  }

  apply(): void {
    this.dialogRef.close({
      classId: this.classId(),
      sectionId: this.sectionId(),
      isActive: this.isActive()
    } satisfies StudentFilterValues);
  }
}