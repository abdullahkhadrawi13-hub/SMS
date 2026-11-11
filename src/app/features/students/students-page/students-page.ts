import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PageEvent } from '@angular/material/paginator';

import { Location } from '@angular/common';

import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ActivatedRoute, NavigationEnd, ParamMap, Router } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Subject, Subscription, debounceTime, filter, take } from 'rxjs';

import { PHONE_QUERY } from '../../../layouts/dashboard-layout/dashboard-layout';

import { Students } from '../../../core/services/students';
import { PagedResult } from '../../../core/models/paged-result';

import { ApiMessageService } from '../../../core/services/api-message';
import { Permissions } from '../../../core/services/permissions';
import { ActionResult } from '../../../shared/services/action-result';

import { Student } from '../../../core/models/student';

import { StudentsForm, StudentFormResult } from '../students-form/students-form';

import {
  StudentsFilter,
  StudentFilterValues,
  EMPTY_STUDENT_FILTER
} from '../students-filter/students-filter';

import { pluralKey } from '../../../shared/utils/plural';

// How long the search waits after the last key before reloading the list.
const SEARCH_DEBOUNCE_MS = 400;

// The history state key of the step that opened the add / edit form.
const FORM_STEP = 'studentForm';

import { StudentsHeader } from '../students-header/students-header';
import { SearchField } from '../../../shared/components/search-field/search-field';
import { StudentsTable } from '../students-table/students-table';

import {
  ResetPasswordDialog,
  ResetPasswordDialogData,
  ResetPasswordResult
} from '../../../shared/components/reset-password-dialog/reset-password-dialog';



@Component({
  selector: 'app-students-page',

  imports: [
    StudentsHeader,
    SearchField,
    StudentsFilter,
    StudentsTable,

    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslatePipe
  ],

  // The look is the shared "List page" in styles.css (.list-area, .list-toolbar…).
  templateUrl: './students-page.html'
})
export class StudentsPage {

  private readonly studentsService = inject(Students);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly dialog =
    inject(MatDialog);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly apiMessageService =
    inject(ApiMessageService);

  private readonly actionResult = inject(ActionResult);

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);

  // Only the Admin can add, edit, activate or deactivate students.
  // The Assistant Principal and the teacher can only read.
  readonly canManage = this.permissions.canManageStudents;

  readonly students =
    signal<Student[]>([]);

  readonly totalCount =
    signal(0);

  readonly pageNumber =
    signal(1);

  readonly pageSize =
    signal(10);

  readonly search =
    signal('');

  readonly statusFilter =
    signal<boolean | undefined>(undefined);

  readonly classFilter =
    signal<number | undefined>(undefined);

  readonly sectionFilter =
    signal<number | undefined>(undefined);

  readonly isLoading =
    signal(false);

  readonly errorMessage =
    signal('');

  // Did the last loaded list use a search or a filter?
  // Chooses the empty message: "no match" or "no students yet".
  readonly hasQuery =
    signal(false);

  // The list has loaded at least once with no error:
  // the number of results shows only then (not "0 students" while loading).
  readonly hasLoaded =
    signal(false);

  // The number under the search: the matching students of the last
  // loaded list. null without a search or filter (the total is in the
  // pagination under the table), while loading the first time, or on error.
  readonly resultCount = computed(() =>
    this.hasLoaded() && !this.errorMessage() && this.hasQuery()
      ? this.totalCount()
      : null
  );

  // Its translation key, with the right Arabic plural form
  // ("طالب واحد يطابق البحث"، "3 طلاب يطابقون البحث"، ...).
  readonly resultsKey = computed(() => {
    const count = this.resultCount();

    return count === null ? null : pluralKey('STUDENTS.COUNT.MATCHING', count);
  });


  // ===== Phone: the filters open under the search =====

  private readonly breakpoints = inject(BreakpointObserver);

  // true when the screen is narrower than 720px (same as the layout).
  readonly isPhone = signal(this.breakpoints.isMatched(PHONE_QUERY));

  // The "Filter" button on the phone opens or closes the three lists.
  readonly filtersOpen = signal(false);

  // How many filters are on (the number on the phone's "Filter" button).
  readonly activeFilterCount = computed(() =>
    (this.classFilter() !== undefined ? 1 : 0) +
    (this.sectionFilter() !== undefined ? 1 : 0) +
    (this.statusFilter() !== undefined ? 1 : 0)
  );


  // ===== Search while typing =====

  // Every key typed in the search field.
  private readonly searchTyping = new Subject<string>();

  // The search text of the last request, so the same text is not sent twice
  // (Enter, then the 400ms timer for the same text).
  private lastSearch = '';

  // The request in progress: a newer one cancels it,
  // so an old answer never replaces a newer list.
  private loadSubscription?: Subscription;


  // ===== Add / edit form (see "Add / edit form in the URL") =====

  private readonly location = inject(Location);

  // The open form, and which one: 'new' or the student id as text.
  private formDialog?: MatDialogRef<StudentsForm>;
  private formKey: string | null = null;

  // Forms closed because the URL changed: nothing to fix in the URL after.
  private readonly closedByUrl = new WeakSet<MatDialogRef<StudentsForm>>();


  constructor() {

    // Restore the search, filter and page from the URL
    // (e.g. after "Back" from a student's page, or a refresh).
    this.readStateFromUrl(this.route.snapshot.queryParamMap);

    this.loadStudents();

    // Search by itself 400ms after the user stops typing.
    this.searchTyping
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (this.search().trim() !== this.lastSearch) {
          this.onSearch();
        }
      });

    this.breakpoints
      .observe(PHONE_QUERY)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => this.isPhone.set(result.matches));

    // Opened from a link that already has filters (e.g. "Back" from a
    // student's page): show them on the phone too.
    this.filtersOpen.set(this.activeFilterCount() > 0);

    // The add / edit form follows ?form=new and ?edit=12 in the URL.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => this.syncFormWithUrl(params));

    // Leaving the page (e.g. a second "Back" while "Discard changes?"
    // is open): the form does not stay open over the next page.
    this.destroyRef.onDestroy(() => {
      if (this.formDialog) {
        this.closedByUrl.add(this.formDialog);
        this.formDialog.close();
      }
    });

  }


  // ===== List state in the URL =====
  // /students?search=..&classId=..&sectionId=..&isActive=..&page=..&pageSize=..
  // Empty values are left out, so the plain list stays /students.
  // ?form / ?edit (the open form) are kept as they are: 'merge'.

  private readStateFromUrl(params: ParamMap): void {

    this.search.set(params.get('search') ?? '');

    this.classFilter.set(this.toPositiveNumber(params.get('classId')));
    this.sectionFilter.set(this.toPositiveNumber(params.get('sectionId')));

    const isActive = params.get('isActive');
    this.statusFilter.set(
      isActive === 'true' ? true : isActive === 'false' ? false : undefined
    );

    this.pageNumber.set(this.toPositiveNumber(params.get('page')) ?? 1);
    this.pageSize.set(this.toPositiveNumber(params.get('pageSize')) ?? 10);

  }


  private writeStateToUrl(): void {

    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        search: this.search().trim() || null,
        classId: this.classFilter() ?? null,
        sectionId: this.sectionFilter() ?? null,
        isActive: this.statusFilter() ?? null,
        page: this.pageNumber() > 1 ? this.pageNumber() : null,
        pageSize: this.pageSize() !== 10 ? this.pageSize() : null
      },
      queryParamsHandling: 'merge'
    });

    // Nothing changed (e.g. the first load): no navigation.
    if (this.router.serializeUrl(urlTree) === this.router.url) {
      return;
    }

    // Replace, so every filter change does not add a step to "Back".
    this.router.navigateByUrl(urlTree, { replaceUrl: true });

  }


  private toPositiveNumber(value: string | null): number | undefined {

    const number = Number(value);

    return Number.isInteger(number) && number > 0 ? number : undefined;

  }


  loadStudents(): void {

    this.writeStateToUrl();

    this.lastSearch = this.search().trim();

    this.loadSubscription?.unsubscribe();

    this.isLoading.set(true);

    this.errorMessage.set('');

    const hasQuery =
      !!this.search().trim() ||
      this.classFilter() !== undefined ||
      this.sectionFilter() !== undefined ||
      this.statusFilter() !== undefined;

    this.loadSubscription = this.studentsService
      .getStudents(
        this.pageNumber(),
        this.pageSize(),
        this.search(),
        this.classFilter(),
        this.sectionFilter(),
        this.statusFilter()
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          if (!response.success) {

            this.students.set([]);

            this.totalCount.set(0);

            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );

            this.isLoading.set(false);

            return;
          }

          const data: PagedResult<Student> = response.data;

          // لو الصفحة الحالية رجعت فاضية وهي مش أول صفحة
          // (مثلاً بعد تعطيل آخر طالب فيها) — ارجع صفحة للوراء وأعد التحميل
          if (data.items.length === 0 && data.pageNumber > 1) {

            this.pageNumber.set(data.pageNumber - 1);

            this.loadStudents();

            return;
          }

          this.students.set(data.items);

          this.totalCount.set(data.totalCount);

          this.hasQuery.set(hasQuery);

          this.hasLoaded.set(true);

          this.pageNumber.set(data.pageNumber);

          this.pageSize.set(data.pageSize);

          this.isLoading.set(false);

        },


        error: (error: HttpErrorResponse) => {

          console.error(
            'Failed to load students:',
            error
          );

          this.students.set([]);

          this.totalCount.set(0);

          this.errorMessage.set(
            'STUDENTS.ERROR.LOAD_FAILED'
          );

          this.isLoading.set(false);

        }

      });

  }


  onSearch(): void {

    this.pageNumber.set(1);

    this.loadStudents();

  }


  clearSearch(): void {

    this.search.set('');

    this.pageNumber.set(1);

    this.loadStudents();

  }


  // A key was typed: the list reloads 400ms after the last one.
  onSearchTyping(value: string): void {

    this.searchTyping.next(value);

  }


  onPageChange(
    event: PageEvent
  ): void {

    this.pageNumber.set(
      event.pageIndex + 1
    );

    this.pageSize.set(
      event.pageSize
    );

    this.loadStudents();

  }


  // Opens the student's page (/students/:id).
  // fromStudentsList tells that page that "Back" can return here
  // with the same search, filter and page.
  openStudentDetails(
    studentId: number
  ): void {

    this.router.navigate(['/students', studentId], {
      state: { fromStudentsList: true }
    });

  }


  // ===== Add / edit form in the URL =====
  // /students?form=new   the add form
  // /students?edit=12    the edit form of student 12
  // (the search, filter and page stay in the URL next to them)
  //
  // The buttons only put the form in the URL, as a new step in the
  // browser history; syncFormWithUrl() opens it. So:
  //   - "Back" takes it out of the URL: the form closes (after
  //     "Discard changes?" when something was typed) and the list stays
  //   - a refresh or a direct link opens the form again
  //   - ✕, Cancel and saving close the form and take the step back out

  openAddStudent(): void {

    this.putFormInUrl('new');

  }


  openEditStudent(
    studentId: number
  ): void {

    this.putFormInUrl(String(studentId));

  }


  // 'new', the edited student's id as text, or null for no form.
  private formKeyFromUrl(params: ParamMap): string | null {

    if (params.get('form') === 'new') {
      return 'new';
    }

    const studentId = this.toPositiveNumber(params.get('edit'));

    return studentId !== undefined ? String(studentId) : null;

  }


  // Runs on every change of the query params (and once at the start).
  private syncFormWithUrl(params: ParamMap): void {

    const key = this.formKeyFromUrl(params);

    if (key === this.formKey) {
      return;
    }

    // Only the Admin adds and edits: a link with ?form / ?edit
    // opened by anyone else just shows the list.
    if (key !== null && !this.canManage()) {
      this.takeFormOutOfUrl();
      return;
    }

    const openDialog = this.formDialog;

    if (!openDialog) {
      if (key !== null) {
        this.openForm(key);
      }
      return;
    }

    // "Back" (or "Forward") changed the form in the URL while it is open.
    openDialog.componentInstance
      .confirmDiscard()
      .subscribe(canClose => {

        if (!canClose) {
          // "Cancel" on "Discard changes?" (or still saving):
          // the form stays, so it goes back in the URL too.
          this.putFormInUrl(this.formKey!);
          return;
        }

        this.closedByUrl.add(openDialog);
        openDialog.close();

        this.formDialog = undefined;
        this.formKey = null;

        if (key !== null) {
          this.openForm(key);
        }

      });

  }


  private openForm(key: string): void {

    const studentId = key === 'new' ? undefined : Number(key);

    const dialogRef =
      this.dialog.open(StudentsForm, {

        width: '880px',

        maxWidth: '95vw',

        maxHeight: '90vh',

        // Shared form panel (styles.css): full screen on the phone
        panelClass: 'form-dialog',

        // "Back" must not close it by itself: syncFormWithUrl() decides,
        // so "Discard changes?" can still be asked.
        closeOnNavigation: false,

        data: studentId !== undefined ? { studentId } : undefined

      });

    this.formDialog = dialogRef;
    this.formKey = key;


    dialogRef
      .afterClosed()
      .subscribe((result?: StudentFormResult) => {

        // Saved: reload the list and show the backend message, after the
        // URL is right (a "Back" step closes any dialog open during it).
        const afterSave = () => {
          if (result?.success) {
            this.loadStudents();
            this.actionResult.show('success', result.message);
          }
        };

        // Closed because the URL changed: the URL is already right.
        if (this.closedByUrl.has(dialogRef)) {
          this.closedByUrl.delete(dialogRef);
          afterSave();
          return;
        }

        // Closed from the form (✕, Cancel, saved): take it out of the URL.
        this.formDialog = undefined;
        this.formKey = null;

        this.takeFormOutOfUrl(afterSave);

      });

  }


  // Adds the form to the URL as a new step of the history.
  private putFormInUrl(key: string): void {

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: key === 'new'
        ? { form: 'new', edit: null }
        : { form: null, edit: key },
      queryParamsHandling: 'merge',
      // Marks this history step as ours: takeFormOutOfUrl() goes back
      // over it instead of adding another step.
      state: { [FORM_STEP]: true }
    });

  }


  // done: runs once the URL has no form any more.
  private takeFormOutOfUrl(done: () => void = () => {}): void {

    // The form was opened by our button (also after a refresh: the browser
    // keeps the step's state): "Back" over that step, so the next "Back"
    // does not land on the same list again.
    const state = this.location.getState() as Record<string, unknown> | null;

    if (state?.[FORM_STEP] === true) {
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          take(1),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => done());

      this.location.back();
      return;
    }

    // Opened from a direct link: there is no list step before it.
    this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { form: null, edit: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      })
      .then(() => done());

  }


  // A filter changed in the search row: applied straight away.
  onFilterChange(values: StudentFilterValues): void {

    this.classFilter.set(values.classId ?? undefined);
    this.sectionFilter.set(values.sectionId ?? undefined);
    this.statusFilter.set(values.isActive ?? undefined);

    this.pageNumber.set(1);

    this.loadStudents();

  }


  // "Clear filters" next to the number of results: the three lists back
  // to "All". The search text stays (it has its own ✕).
  clearFilters(): void {

    this.onFilterChange({ ...EMPTY_STUDENT_FILTER });

  }


  toggleFilters(): void {

    this.filtersOpen.update(open => !open);

  }


  toggleStudentStatus(
  student: Student
): void {

  const newStatus =
    !student.isActive;


  this.studentsService
    .updateStudentStatus(
      student.studentId,
      newStatus
    )
    .pipe(
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe({

      next: response => {

        if (!response.success) {

          this.actionResult.show(
            'error',
            this.apiMessageService.getMessage(response)
          );

          return;
        }


        this.loadStudents();

        this.actionResult.show(
          'success',
          this.apiMessageService.getMessage(response)
        );

      },


      error: (error: HttpErrorResponse) => {

        console.error(
          'Failed to update student status:',
          error
        );


        this.actionResult.show(
          'error',
          this.apiMessageService.getErrorMessage(error)
        );

      }

    });

}

  // Opens "Reset password" (POST /api/users/{userId}/reset-password).
  // Nothing in the list changes, so no reload after it.
  openResetPassword(
    student: Student
  ): void {

    this.dialog.open<ResetPasswordDialog, ResetPasswordDialogData, ResetPasswordResult>(
      ResetPasswordDialog,
      {
        width: '520px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: {
          user: student,
          detail: {
            labelKey: 'STUDENTS.STUDENT_NUMBER',
            value: student.studentNumber
          }
        }
      }
    );

  }


  retry(): void {

    this.loadStudents();

  }

}