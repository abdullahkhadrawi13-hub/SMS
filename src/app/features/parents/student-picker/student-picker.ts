import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { catchError, debounceTime, filter, map, of, switchMap, tap } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import { Students } from '../../../core/services/students';
import { Language } from '../../../core/services/language';
import { Student } from '../../../core/models/student';
import { getFullName, getInitials } from '../../../shared/utils/person-name';
import { getAvatarTone, getClassSection } from '../parents';


// Student search (combobox): the same numbers as the teacher combobox
// in the subject assignments form. The search starts after this many
// characters, waits this long after the last key, and shows at most
// this many results.
const STUDENT_SEARCH_MIN_LENGTH = 2;
const STUDENT_SEARCH_DEBOUNCE_MS = 300;
const STUDENT_SEARCH_PAGE_SIZE = 20;


// One student of the results as the list shows it: the names in the
// language of the page (computed once, not on every change check).
interface StudentRow {
  student: Student;
  fullName: string;
  initials: string;
  avatarTone: number;
  classSection: string;

  // Already added / already linked: shown, but cannot be chosen.
  isExcluded: boolean;
}


// Searches students in the backend while the admin types
// (GET /api/students?search=...) and emits the chosen student.
//
// After a choice the field is cleared, so the container decides what
// to show (a row in the add form, a card in the link dialog).
// isActive is not sent: a deactivated student can be linked too.
//
// Navy & gold (11 Nov 2026): the field is the shared look in styles.css
// (.field, .field-box) around a plain <input>, no mat-form-field.
@Component({
  selector: 'app-student-picker',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './student-picker.html',
  styleUrl: './student-picker.css',
})
export class StudentPicker implements OnInit {

  private readonly studentsService = inject(Students);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);

  // Each picker on the screen needs its own id for <label for>.
  private static nextId = 0;

  readonly inputId = `student-picker-${StudentPicker.nextId++}`;


  // Students that cannot be chosen (already added or already linked).
  // They stay in the results, disabled, with excludedLabel next to them.
  readonly excludedIds = input<number[]>([]);

  // Translation key shown next to an excluded student.
  readonly excludedLabel = input('PARENTS.PICKER.ADDED');

  // Disables the field (while saving).
  readonly disabled = input(false);

  // Emitted when the admin chooses a student.
  readonly selected = output<Student>();


  readonly minSearchLength = STUDENT_SEARCH_MIN_LENGTH;

  // The typed text, or the chosen student for a moment before it is cleared.
  readonly searchControl = new FormControl<string | Student | null>('');

  readonly results = signal<Student[]>([]);
  readonly isSearching = signal(false);
  readonly hasError = signal(false);

  // The text of the last finished search ('' = no search yet).
  readonly searchedText = signal('');

  // The results with their names in the language of the page.
  // Recomputed when the results, the excluded students or the language change.
  readonly rows = computed<StudentRow[]>(() => {

    const isArabic = this.language.currentDirection() === 'rtl';
    const excludedIds = this.excludedIds();

    return this.results().map(student => ({
      student,
      fullName: getFullName(student, isArabic),
      initials: getInitials(student, isArabic),
      // The same colour as in the students list.
      avatarTone: getAvatarTone(student.studentId),
      classSection: getClassSection(student, isArabic),
      isExcluded: excludedIds.includes(student.studentId)
    }));

  });


  ngOnInit(): void {
    this.listenToSearch();
  }


  // One request after a short pause; a newer search cancels the older one.
  private listenToSearch(): void {

    this.searchControl.valueChanges
      .pipe(
        // A chosen student (object) is not a search.
        filter((value): value is string => typeof value === 'string'),
        map(value => value.trim()),

        tap(text => {
          this.results.set([]);
          this.hasError.set(false);
          this.searchedText.set('');
          this.isSearching.set(text.length >= STUDENT_SEARCH_MIN_LENGTH);
        }),

        debounceTime(STUDENT_SEARCH_DEBOUNCE_MS),

        switchMap(text => {

          if (text.length < STUDENT_SEARCH_MIN_LENGTH) {
            return of(null);
          }

          return this.studentsService
            .getStudents(1, STUDENT_SEARCH_PAGE_SIZE, text)
            .pipe(
              map(response => ({ text, response })),
              catchError((error: HttpErrorResponse) => {
                console.error('Failed to search students:', error);
                return of({ text, response: null });
              })
            );
        }),

        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {

        this.isSearching.set(false);

        if (!result) {
          return;
        }

        if (!result.response?.success) {
          this.hasError.set(true);
          return;
        }

        this.results.set(result.response.data.items);
        this.searchedText.set(result.text);
      });
  }


  // Emits the chosen student, then clears the field for the next search.
  onSelected(student: Student): void {

    this.selected.emit(student);

    this.searchControl.setValue('');
  }


  clear(): void {
    this.searchControl.setValue('');
  }


  // The field is cleared right after a choice, so an object shows nothing.
  readonly displayValue = (value: string | Student | null): string =>
    typeof value === 'string' ? value : '';


  // The typed text, used to show the hint and the clear button.
  get typedText(): string {

    const value = this.searchControl.value;

    return typeof value === 'string' ? value.trim() : '';
  }
}
