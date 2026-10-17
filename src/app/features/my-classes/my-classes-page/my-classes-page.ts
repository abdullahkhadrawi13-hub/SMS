import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { SubjectPlansService } from '../../../core/services/subject-plans';
import { TeacherAssignmentsService } from '../../../core/services/teacher-assignments';

import { MyClassesStats as MyClassesStatsData, MyClassGroup } from '../my-class';
import { MyClassesStats } from '../my-classes-stats/my-classes-stats';
import { MyClassCard } from '../my-class-card/my-class-card';
import { SubjectPlan } from '../../../core/models/subject-plan';
import { TeacherAssignment } from '../../../core/models/teacher-assignment';


// "My classes" for the teacher (parent page).
// Loads the teacher's assignments in the current term
// (GET /api/teacherassignments/mine, API Reference section 8),
// then the subject plans of that term (GET /api/subjectplans?academicTermId=,
// section 9) for the passing mark and the lock of each subject,
// groups them by class + section, and passes the result to the children:
//   - my-classes-stats: the numbers above the cards
//   - my-class-card: one card per class + section
// Read-only. The teacher cannot read the classes, sections or subjects lists (403).
@Component({
  selector: 'app-my-classes-page',
  imports: [
    MyClassesStats,
    MyClassCard,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './my-classes-page.html',
  styleUrl: './my-classes-page.css',
})
export class MyClassesPage implements OnInit {

  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly plansService = inject(SubjectPlansService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  // Active assignments of the logged-in teacher (current term).
  readonly assignments = signal<TeacherAssignment[]>([]);

  // The subject plans of the term, by subjectPlanId.
  // Empty when the plans could not be loaded: the cards still show the subjects.
  readonly plans = signal<Map<number, SubjectPlan>>(new Map());

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // One group per class + section.
  // Cards sorted by class, then section; subjects inside a card sorted by name.
  readonly groups = computed<MyClassGroup[]>(() => {

    const isArabic = this.isArabic();
    const byKey = new Map<string, MyClassGroup>();

    for (const assignment of this.assignments()) {

      const key = `${assignment.classId}-${assignment.sectionId}`;

      let group = byKey.get(key);

      if (!group) {
        group = {
          classId: assignment.classId,
          sectionId: assignment.sectionId,
          className: isArabic ? assignment.classNameAr : assignment.classNameEn,
          sectionName: isArabic ? assignment.sectionAr : assignment.sectionEn,
          subjects: [],
        };

        byKey.set(key, group);
      }

      group.subjects.push({
        assignment,
        subjectName: isArabic ? assignment.subjectAr : assignment.subjectEn,
        plan: this.findPlan(assignment),
      });
    }

    const groups = [...byKey.values()];

    for (const group of groups) {
      group.subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    }

    // The assignment has no class level, so classes are sorted by classId.
    return groups.sort((a, b) =>
      a.classId - b.classId
      || a.sectionName.localeCompare(b.sectionName)
    );
  });


  readonly stats = computed<MyClassesStatsData>(() => {

    const assignments = this.assignments();

    return {
      sectionsCount: this.groups().length,
      subjectsCount: new Set(assignments.map(a => a.subjectId)).size,
      lockedCount: assignments.filter(a => this.findPlan(a)?.isLocked).length,
      totalAssignments: assignments.length,
    };
  });


  // The term name comes from the assignments (the teacher cannot read the terms list).
  readonly termName = computed(() => {

    const first = this.assignments()[0];

    if (!first) {
      return '';
    }

    return this.isArabic()
      ? first.academicTermNameAr
      : first.academicTermNameEn;
  });


  ngOnInit(): void {
    this.loadMyClasses();
  }


  // GET /api/teacherassignments/mine (current term).
  // 400 when the user has no teacher profile or no current term is set:
  // the backend message is shown.
  loadMyClasses(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.assignmentsService
      .getMyAssignments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.assignments.set([]);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );
            this.isLoading.set(false);
            return;
          }

          this.assignments.set(response.data);
          this.isLoading.set(false);

          this.loadPlans(response.data);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load my classes:', error);

          this.assignments.set([]);
          this.errorMessage.set(
            this.apiMessageService.getErrorMessage(error)
          );
          this.isLoading.set(false);
        },
      });
  }


  // GET /api/subjectplans?academicTermId=... (the term of the assignments).
  // The cards are shown before this answer arrives; the passing mark and
  // the lock appear when it does. A failure only hides them.
  private loadPlans(assignments: TeacherAssignment[]): void {

    const termId = assignments[0]?.academicTermId;

    if (termId === undefined) {
      this.plans.set(new Map());
      return;
    }

    this.plansService
      .getPlans({ academicTermId: termId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.plans.set(
            new Map(
              (response.success ? response.data : [])
                .map(plan => [plan.subjectPlanId, plan])
            )
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load subject plans:', error);
          this.plans.set(new Map());
        },
      });
  }


  // The plan an assignment follows, or null (no plan yet, or not loaded).
  private findPlan(assignment: TeacherAssignment): SubjectPlan | null {

    return assignment.subjectPlanId === null
      ? null
      : this.plans().get(assignment.subjectPlanId) ?? null;
  }
}
