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
import { SectionsService } from '../../../core/services/sections';
import { TeacherAssignmentsService } from '../../../core/services/teacher-assignments';
import { Permissions } from '../../../core/services/permissions';
import { SchoolClassSimpleDto } from '../../../core/models/school-class';
import { SectionSimpleDto } from '../../../core/models/section';
import { TeacherAssignment } from '../../../core/models/teacher-assignment';

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

// فلتر الطلاب.
// المدير ومساعد المدير: الصفوف والشعب من خدمات الصفوف والشعب.
// المعلم: يحصل على 403 من قوائم الصفوف والشعب، لذلك تُبنى القوائم
// من تعييناته في الفصل الحالي (GET /api/teacherassignments/mine)،
// فيرى فقط الصفوف والشعب التي يدرّسها.
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
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly permissions = inject(Permissions);
  private readonly initial =
    inject<StudentFilterValues | null>(MAT_DIALOG_DATA, { optional: true })
    ?? EMPTY_STUDENT_FILTER;

  // المعلم يأخذ القوائم من تعييناته
  private readonly isTeacher = this.permissions.isTeacher();

  // تعيينات المعلم (فارغة لغير المعلم)
  private readonly myAssignments = signal<TeacherAssignment[]>([]);

  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<SectionSimpleDto[]>([]);

  readonly isLoadingClasses = signal(false);
  readonly isLoadingSections = signal(false);

  readonly classId = signal<number | null>(this.initial.classId);
  readonly sectionId = signal<number | null>(this.initial.sectionId);
  readonly isActive = signal<boolean | null>(this.initial.isActive);

  constructor() {
    if (this.isTeacher) {
      this.loadTeacherOptions();
      return;
    }

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

    // المعلم: الشعب من تعييناته، بدون طلب للـ backend
    if (this.isTeacher) {
      this.setTeacherSections(classId, selectedSectionId);
      return;
    }

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


  // =========================
  // Teacher
  // =========================

  // تعيينات المعلم في الفصل الحالي، ومنها قائمة الصفوف.
  private loadTeacherOptions(): void {
    this.isLoadingClasses.set(true);

    this.assignmentsService
      .getMyAssignments()
      .pipe(
        catchError(error => {
          console.error('Failed to load my assignments:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(response => {
        const assignments = response?.success ? response.data : [];

        this.myAssignments.set(assignments);
        this.classes.set(this.buildTeacherClasses(assignments));
        this.isLoadingClasses.set(false);

        // استعادة الفلتر السابق عند إعادة فتح النافذة
        const classId = this.initial.classId;

        if (classId && this.classes().some(c => c.schoolClassId === classId)) {
          this.setTeacherSections(classId, this.initial.sectionId);
        } else {
          this.classId.set(null);
          this.sectionId.set(null);
        }
      });
  }

  // صف واحد لكل classId، مرتبة حسب classId (مثل صفحة صفوفي)
  private buildTeacherClasses(assignments: TeacherAssignment[]): SchoolClassSimpleDto[] {
    const byId = new Map<number, SchoolClassSimpleDto>();

    for (const a of assignments) {
      if (!byId.has(a.classId)) {
        byId.set(a.classId, {
          schoolClassId: a.classId,
          classNameAr: a.classNameAr,
          classNameEn: a.classNameEn
        });
      }
    }

    return [...byId.values()].sort((a, b) => a.schoolClassId - b.schoolClassId);
  }

  // شعب الصف المختار التي يدرّس فيها المعلم (بدون تكرار)
  private setTeacherSections(classId: number, selectedSectionId: number | null): void {
    const byId = new Map<number, SectionSimpleDto>();

    for (const a of this.myAssignments()) {
      if (a.classId === classId && !byId.has(a.sectionId)) {
        byId.set(a.sectionId, {
          sectionId: a.sectionId,
          classId: a.classId,
          sectionAr: a.sectionAr,
          sectionEn: a.sectionEn,
          isActive: true
        });
      }
    }

    const sections = [...byId.values()].sort((a, b) =>
      this.getSectionName(a).localeCompare(this.getSectionName(b))
    );

    this.sections.set(sections);
    this.isLoadingSections.set(false);

    this.sectionId.set(
      sections.some(s => s.sectionId === selectedSectionId)
        ? selectedSectionId
        : null
    );
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