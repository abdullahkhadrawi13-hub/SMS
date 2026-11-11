import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../core/services/language';
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


// فلتر الطلاب: ثلاث قوائم في نفس سطر البحث (لم يعد نافذة).
// "مسح الفلاتر" في الصفحة، بجانب عدد النتائج تحت البحث.
// كل تغيير يُطبَّق مباشرة: يرسل filterChange والصفحة تعيد التحميل.
// الصفحة تملك القيم (وتحفظها في الرابط)، وهذا المكوّن يعرضها فقط.
//
// المدير ومساعد المدير: الصفوف والشعب من خدمات الصفوف والشعب.
// المعلم: يحصل على 403 من قوائم الصفوف والشعب، لذلك تُبنى القوائم
// من تعييناته في الفصل الحالي (GET /api/teacherassignments/mine)،
// فيرى فقط الصفوف والشعب التي يدرّسها.
@Component({
  selector: 'app-students-filter',
  imports: [
    TranslatePipe
  ],
  templateUrl: './students-filter.html',
  // The shared look in styles.css ("List page": .list-filters, .filter-select).
  host: { class: 'list-filters' }
})
export class StudentsFilter {

  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(Language);
  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly permissions = inject(Permissions);

  // ===== The current values (owned by the parent page) =====
  readonly classId = input<number | null>(null);
  readonly sectionId = input<number | null>(null);
  readonly isActive = input<boolean | null>(null);

  // A filter changed: the new values of the three lists.
  readonly filterChange = output<StudentFilterValues>();

  // المعلم يأخذ القوائم من تعييناته
  private readonly isTeacher = this.permissions.isTeacher();

  // تعيينات المعلم (فارغة لغير المعلم)
  private readonly myAssignments = signal<TeacherAssignment[]>([]);

  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<SectionSimpleDto[]>([]);

  private readonly classesLoaded = signal(false);
  readonly isLoadingSections = signal(false);

  // The section list waits for a class (spec: "الشعبة: اختر صفًا أولًا").
  readonly sectionDisabled = computed(() =>
    !this.classId() || this.isLoadingSections()
  );

  private readonly isArabic = computed(() =>
    this.language.currentDirection() === 'rtl'
  );


  constructor() {

    if (this.isTeacher) {
      this.loadTeacherOptions();
    } else {
      this.loadClasses();
    }

    // Load the sections of the chosen class whenever the class changes
    // (picked here, restored from the URL, or cleared).
    effect(() => {
      const classId = this.classId();

      untracked(() => {
        // The teacher's sections come from the assignments, after they load.
        if (this.isTeacher && !this.classesLoaded()) {
          return;
        }

        this.loadSections(classId);
      });
    });

  }


  // ===== Lists =====

  // الصفوف النشطة فقط
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
        this.classesLoaded.set(true);
      });

  }


  // شعب الصف المختار فقط
  private loadSections(classId: number | null): void {

    this.sections.set([]);

    if (!classId) {
      this.isLoadingSections.set(false);
      return;
    }

    // المعلم: الشعب من تعييناته، بدون طلب للـ backend
    if (this.isTeacher) {
      this.setTeacherSections(classId);
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
        // تجاهل الرد إذا تغيّر الصف أثناء التحميل
        if (this.classId() !== classId) {
          return;
        }

        this.sections.set(response?.success ? response.data : []);
        this.isLoadingSections.set(false);

        this.dropUnknownSection();
      });

  }


  // تعيينات المعلم في الفصل الحالي، ومنها قائمة الصفوف.
  private loadTeacherOptions(): void {

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
        this.classesLoaded.set(true);

        // A class from the URL that the teacher does not teach: clear it.
        const classId = this.classId();

        if (classId && !this.classes().some(c => c.schoolClassId === classId)) {
          this.emit({ classId: null, sectionId: null });
          return;
        }

        this.loadSections(classId);
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
  private setTeacherSections(classId: number): void {

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

    this.dropUnknownSection();

  }


  // A section from the URL that is not in the class's list: clear it,
  // so the list never shows "All" while a hidden section filter is on.
  private dropUnknownSection(): void {

    const sectionId = this.sectionId();

    if (sectionId && !this.sections().some(s => s.sectionId === sectionId)) {
      this.emit({ sectionId: null });
    }

  }


  // ===== Changes (applied straight away) =====

  // The <select> gives a string: '' means "All".
  onClassChange(value: string): void {

    // تصفير الشعبة دائمًا عند تغيير الصف
    this.emit({
      classId: value ? Number(value) : null,
      sectionId: null
    });

  }

  onSectionChange(value: string): void {

    this.emit({ sectionId: value ? Number(value) : null });

  }

  onStatusChange(value: string): void {

    this.emit({
      isActive: value === 'true' ? true : value === 'false' ? false : null
    });

  }

  private emit(change: Partial<StudentFilterValues>): void {

    this.filterChange.emit({
      classId: this.classId(),
      sectionId: this.sectionId(),
      isActive: this.isActive(),
      ...change
    });

  }


  // ===== Names =====

  getClassName(c: SchoolClassSimpleDto): string {
    return this.isArabic()
      ? c.classNameAr || c.classNameEn
      : c.classNameEn || c.classNameAr;
  }

  getSectionName(s: SectionSimpleDto): string {
    return this.isArabic()
      ? s.sectionAr || s.sectionEn
      : s.sectionEn || s.sectionAr;
  }

  // The <select> value of the account status: '' | 'true' | 'false'.
  readonly statusValue = computed(() => {
    const value = this.isActive();
    return value === null ? '' : String(value);
  });
}
