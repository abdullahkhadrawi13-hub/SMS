import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { ParentChildDto } from '../../../../core/models/parent';
import { StudentStatus } from '../../../../core/models/student';
import { StudentGradesTerm } from '../../../../core/models/student-grades-report';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { ParentsService } from '../../../../core/services/parents';
import { StudentGradesService } from '../../../../core/services/student-grades';
import { getCardColor } from '../../../../shared/constants/card-colors';
import { getArabicName, getEnglishName } from '../../../parents/parents';

import { TermGrades } from '../term-grades/term-grades';
import {
  getChildStatusMessage,
  getClassSectionParams,
  getTermLabelParams,
  StatusMessage,
} from '../student-grades';


// One child card, ready to show.
interface ChildCard {
  studentId: number;
  name: string;
  initial: string;
  color: string;
  classSection: { class: string; section: string };
  status: StudentStatus;
}


// The parent's Grades page («علامات أبنائي»). Route: /grades (Parent).
//
//   1. GET /api/parents/me → the children (one card each).
//   2. Picking a child → GET /api/studentgrades/by-student/{id}?currentOnly=true
//      (the current term only). Each child is loaded once while the page is
//      open, so going back to a child does not call the API again.
//
// A child whose status is not Active (in the Students table: inactive,
// graduated, moved to another school) has no record in the current term:
// no grades request is sent, a message is shown instead.
// The first active child is picked when the page opens.
//
// Read only, no history button (who changed a mark is for the staff).
@Component({
  selector: 'app-children-grades',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    TermGrades,
  ],
  templateUrl: './children-grades.html',
  styleUrl: './children-grades.css',
})
export class ChildrenGrades implements OnInit {

  private readonly parentsService = inject(ParentsService);
  private readonly gradesService = inject(StudentGradesService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  // Status values used in the template.
  readonly statusInactive = StudentStatus.Inactive;
  readonly statusGraduated = StudentStatus.Graduated;
  readonly statusTransferred = StudentStatus.Transferred;


  // ===== Children (GET /api/parents/me) =====

  readonly children = signal<ParentChildDto[]>([]);
  readonly childrenLoading = signal(false);
  readonly childrenError = signal('');

  readonly selectedId = signal<number | null>(null);


  // ===== Grades of the selected child =====

  // By studentId: the current term, or null (no record in it).
  // A child that is not here has not been loaded yet.
  private readonly terms = signal<Record<number, StudentGradesTerm | null>>({});

  readonly gradesLoading = signal(false);
  readonly gradesError = signal('');

  // The request of the child being loaded (cancelled when another is picked).
  private gradesRequest: Subscription | null = null;


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly cards = computed<ChildCard[]>(() => {

    const isArabic = this.isArabic();

    return this.children().map((child, index) => {

      const name = isArabic
        ? getArabicName(child) || getEnglishName(child)
        : getEnglishName(child) || getArabicName(child);

      const firstName = isArabic
        ? child.firstNameAr || child.firstNameEn
        : child.firstNameEn || child.firstNameAr;

      return {
        studentId: child.studentId,
        name,
        initial: (firstName ?? '').trim().charAt(0).toUpperCase(),
        color: getCardColor(index).main,
        classSection: getClassSectionParams(child, isArabic),
        status: child.studentStatus,
      };
    });
  });

  readonly hasManyChildren = computed(() => this.children().length > 1);

  readonly selectedCard = computed(() =>
    this.cards().find(card => card.studentId === this.selectedId()) ?? null
  );

  // A child that is not Active: the message shown instead of the grades.
  readonly statusMessage = computed<StatusMessage | null>(() => {

    const card = this.selectedCard();

    return card && card.status !== StudentStatus.Active
      ? getChildStatusMessage(card.status)
      : null;
  });

  // undefined = not loaded yet, null = no record in the current term.
  readonly selectedTerm = computed<StudentGradesTerm | null | undefined>(() => {

    const id = this.selectedId();
    const terms = this.terms();

    return id !== null && id in terms ? terms[id] : undefined;
  });

  // The current term of the header: the selected child's, or any loaded one
  // (all the children are in the same current term).
  readonly termLabel = computed(() => {

    const term = this.selectedTerm()
      ?? Object.values(this.terms()).find(t => !!t)
      ?? null;

    return term ? getTermLabelParams(term, this.isArabic()) : null;
  });

  // The class of the selected child: from the term when it is loaded
  // (the class in that term), else the child's current class.
  readonly classSection = computed(() => {

    const term = this.selectedTerm();

    if (term) {
      return getClassSectionParams(term, this.isArabic());
    }

    return this.selectedCard()?.classSection ?? null;
  });


  ngOnInit(): void {
    this.loadChildren();
  }


  // GET /api/parents/me
  loadChildren(): void {

    this.childrenLoading.set(true);
    this.childrenError.set('');

    this.parentsService
      .getMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.childrenLoading.set(false);

          if (!response.success || !response.data) {
            this.children.set([]);
            this.childrenError.set(this.apiMessageService.getMessage(response));
            return;
          }

          const children = response.data.children ?? [];

          this.children.set(children);

          // Start with the first active child (else the first child).
          const first =
            children.find(c => c.studentStatus === StudentStatus.Active)
            ?? children[0];

          if (first) {
            this.select(first.studentId);
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the children:', error);

          this.childrenLoading.set(false);
          this.children.set([]);
          this.childrenError.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // Picks a child. The grades are loaded only for an active child,
  // and only the first time.
  select(studentId: number): void {

    this.selectedId.set(studentId);

    // A request of another child that has not answered yet is not needed.
    this.cancelGradesRequest();
    this.gradesError.set('');

    const child = this.children().find(c => c.studentId === studentId);

    if (!child || child.studentStatus !== StudentStatus.Active) {
      return;
    }

    if (studentId in this.terms()) {
      return;
    }

    this.loadGrades(studentId);
  }


  // GET /api/studentgrades/by-student/{studentId}?currentOnly=true
  loadGrades(studentId: number): void {

    this.cancelGradesRequest();

    this.gradesLoading.set(true);
    this.gradesError.set('');

    this.gradesRequest = this.gradesService
      .getByStudent(studentId, { currentOnly: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.gradesLoading.set(false);

          if (!response.success || !response.data) {
            this.gradesError.set(this.apiMessageService.getMessage(response));
            return;
          }

          // terms: [] = no record in the current term.
          const term = response.data.terms[0] ?? null;

          this.terms.update(terms => ({ ...terms, [studentId]: term }));
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the child\'s grades:', error);

          this.gradesLoading.set(false);

          // 400: not one of this parent's children (the message says so).
          // 404: the student does not exist.
          this.gradesError.set(
            error.status === 404
              ? 'STUDENT_GRADES.NOT_FOUND'
              : this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }

  retryGrades(): void {

    const id = this.selectedId();

    if (id !== null) {
      this.loadGrades(id);
    }
  }


  private cancelGradesRequest(): void {
    this.gradesRequest?.unsubscribe();
    this.gradesRequest = null;
    this.gradesLoading.set(false);
  }
}
