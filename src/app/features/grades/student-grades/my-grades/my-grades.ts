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

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { StudentGradesTerm } from '../../../../core/models/student-grades-report';
import { ApiMessageService } from '../../../../core/services/api-message';
import { Language } from '../../../../core/services/language';
import { StudentGradesService } from '../../../../core/services/student-grades';

import { TermGrades } from '../term-grades/term-grades';
import {
  getClassSectionParams,
  getTermLabelParams,
} from '../student-grades';


// The student's Grades page («علاماتي»). Route: /grades (Student).
// GET /api/studentgrades/me?currentOnly=true: the current term only.
// The past terms belong to the «Results» and «Academic record» pages
// (they call the same endpoint without currentOnly).
//
// Read only, no history button (who changed a mark is for the staff).
// A mark shows here as soon as the teacher saves it.
@Component({
  selector: 'app-my-grades',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    TermGrades,
  ],
  templateUrl: './my-grades.html',
  styleUrl: './my-grades.css',
})
export class MyGrades implements OnInit {

  private readonly gradesService = inject(StudentGradesService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);


  // undefined = not loaded yet, null = no record in the current term.
  readonly term = signal<StudentGradesTerm | null | undefined>(undefined);

  readonly loading = signal(false);
  readonly errorMessage = signal('');


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly termLabel = computed(() => {
    const term = this.term();
    return term ? getTermLabelParams(term, this.isArabic()) : null;
  });

  readonly classSection = computed(() => {
    const term = this.term();
    return term ? getClassSectionParams(term, this.isArabic()) : null;
  });


  ngOnInit(): void {
    this.load();
  }


  // GET /api/studentgrades/me?currentOnly=true
  load(): void {

    this.loading.set(true);
    this.errorMessage.set('');

    this.gradesService
      .getMine({ currentOnly: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.loading.set(false);

          if (!response.success || !response.data) {
            this.term.set(undefined);
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            return;
          }

          // terms: [] = no record in the current term (e.g. a graduate).
          this.term.set(response.data.terms[0] ?? null);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load my grades:', error);

          this.loading.set(false);
          this.term.set(undefined);

          // 404: this account has no student record.
          this.errorMessage.set(
            error.status === 404
              ? 'STUDENT_GRADES.NOT_FOUND'
              : this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }
}
