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
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import {
  TeacherAssignment,
  TeacherAssignmentsService,
} from '../../../core/services/teacher-assignments';


// "My subjects" for the teacher: the subjects and sections they teach
// in the current term (GET /api/teacherassignments/mine).
// Read-only. The teacher cannot read the subjects or assignments lists (403).
@Component({
  selector: 'app-my-subjects',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './my-subjects.html',
  styleUrl: './my-subjects.css',
})
export class MySubjects implements OnInit {

  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  // Active assignments of the logged-in teacher (current term).
  readonly assignments = signal<TeacherAssignment[]>([]);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly displayedColumns = [
    'subject',
    'className',
    'section',
    'passingMark',
    'structure',
  ];

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // Sorted by subject, then class, then section.
  readonly rows = computed(() => {

    const isArabic = this.isArabic();

    return this.assignments()
      .map(assignment => ({
        assignment,
        subjectName: isArabic ? assignment.subjectAr : assignment.subjectEn,
        className: isArabic ? assignment.classNameAr : assignment.classNameEn,
        sectionName: isArabic ? assignment.sectionAr : assignment.sectionEn,
      }))
      .sort((a, b) =>
        a.subjectName.localeCompare(b.subjectName)
        || a.className.localeCompare(b.className)
        || a.sectionName.localeCompare(b.sectionName)
      );
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

  // Number of different subjects.
  readonly subjectsCount = computed(
    () => new Set(this.assignments().map(a => a.subjectId)).size
  );

  // Number of different sections.
  readonly sectionsCount = computed(
    () => new Set(this.assignments().map(a => a.sectionId)).size
  );

  // Assessment structures that are locked (grades can be entered).
  readonly lockedCount = computed(
    () => this.assignments().filter(a => a.isAssessmentStructureLocked).length
  );

  readonly lockedProgress = computed(() => {

    const total = this.assignments().length;

    return total === 0
      ? 0
      : Math.round((this.lockedCount() / total) * 100);
  });


  ngOnInit(): void {
    this.loadMySubjects();
  }


  // GET /api/teacherassignments/mine (current term).
  // 400 when the user has no teacher profile or no current term is set:
  // the backend message is shown.
  loadMySubjects(): void {

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
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load my subjects:', error);

          this.assignments.set([]);
          this.errorMessage.set(
            this.apiMessageService.getErrorMessage(error)
          );
          this.isLoading.set(false);
        },
      });
  }
}
