import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, ParamMap, Router } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';

import { Subject, Subscription, debounceTime, filter, take } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PageEvent } from '@angular/material/paginator';

import { PHONE_QUERY } from '../../../layouts/dashboard-layout/dashboard-layout';

import { TeachersService } from '../../../core/services/teachers';
import { ApiMessageService } from '../../../core/services/api-message';
import { Permissions } from '../../../core/services/permissions';
import { ActionResult } from '../../../shared/services/action-result';
import { TeacherListDto } from '../../../core/models/teacher';

import { pluralKey } from '../../../shared/utils/plural';

import { SearchField } from '../../../shared/components/search-field/search-field';
import {
  ResetPasswordDialog,
  ResetPasswordDialogData,
  ResetPasswordResult
} from '../../../shared/components/reset-password-dialog/reset-password-dialog';

import { TeacherHeader } from '../teacher-header/teacher-header';
import {
  TeacherFilter,
  TeacherFilterValues,
  EMPTY_TEACHER_FILTER
} from '../teacher-filter/teacher-filter';
import { TeacherTable } from '../teacher-table/teacher-table';
import { TeacherForm, TeacherFormResult } from '../teacher-form/teacher-form';
import { TeacherDetails } from '../teacher-details/teacher-details';


// How long the search waits after the last key before reloading the list.
const SEARCH_DEBOUNCE_MS = 400;

// The history state key of the step that opened the add / edit form.
const FORM_STEP = 'teacherForm';


// The teachers list (navy & gold, 11 Nov 2026). It works like the
// students list:
//   - the search reloads by itself 400ms after the last key
//   - the filter (account status) is next to the search and is applied
//     straight away
//   - the search, the filter and the page are kept in the URL
//   - the add / edit form is in the URL too (?form=new, ?edit=5),
//     so the browser's "Back" closes it and stays on the list
// The look is the shared "List page" in styles.css (.list-area, .list-toolbar…).
@Component({
  selector: 'app-teachers-page',
  imports: [
    TeacherHeader,
    SearchField,
    TeacherFilter,
    TeacherTable,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslatePipe,
  ],
  templateUrl: './teachers-page.html',
})
export class TeachersPage {

  // Service used to communicate with the Teachers API.
  private readonly teachersService = inject(TeachersService);

  // Used to stop pending requests when the page is destroyed.
  private readonly destroyRef = inject(DestroyRef);

  // Opens the teacher dialogs (form, details, reset password).
  private readonly dialog = inject(MatDialog);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  // Shows the success / error result dialog after an action.
  private readonly actionResult = inject(ActionResult);

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);


  // Only the Admin can add, edit, activate or deactivate teachers.
  // The Assistant Principal can only read.
  readonly canManage = this.permissions.canManageTeachers;


  // Teachers of the current page.
  readonly teachers = signal<TeacherListDto[]>([]);

  // Total number of teachers matching the current search and filter.
  readonly totalCount = signal(0);

  // Current page number (1-based, like the API).
  readonly pageNumber = signal(1);

  // Current number of rows displayed per page.
  readonly pageSize = signal(10);

  // Current search text.
  readonly search = signal('');

  // The account status filter: undefined = all.
  readonly statusFilter = signal<boolean | undefined>(undefined);

  // Indicates whether the list is currently loading.
  readonly isLoading = signal(false);

  // Error message (API message or translation key) shown instead of the table.
  readonly errorMessage = signal('');

  // Did the last loaded list use a search or a filter?
  // Chooses the empty message: "no match" or "no teachers yet".
  readonly hasQuery = signal(false);

  // The list has loaded at least once with no error:
  // the number of results shows only then (not "0 teachers" while loading).
  readonly hasLoaded = signal(false);

  // The number under the search: the matching teachers of the last
  // loaded list. null without a search or filter (the total is in the
  // pagination under the table), while loading the first time, or on error.
  readonly resultCount = computed(() =>
    this.hasLoaded() && !this.errorMessage() && this.hasQuery()
      ? this.totalCount()
      : null
  );

  // Its translation key, with the right Arabic plural form
  // ("معلم واحد يطابق البحث"، "3 معلمين يطابقون البحث"، ...).
  readonly resultsKey = computed(() => {
    const count = this.resultCount();

    return count === null ? null : pluralKey('TEACHERS.COUNT.MATCHING', count);
  });


  // ===== Phone: the filter opens under the search =====

  private readonly breakpoints = inject(BreakpointObserver);

  // true when the screen is narrower than 720px (same as the layout).
  readonly isPhone = signal(this.breakpoints.isMatched(PHONE_QUERY));

  // The "Filter" button on the phone opens or closes the filter list.
  readonly filtersOpen = signal(false);

  // How many filters are on (the number on the phone's "Filter" button).
  readonly activeFilterCount = computed(() =>
    this.statusFilter() !== undefined ? 1 : 0
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

  // The open form, and which one: 'new' or the teacher id as text.
  private formDialog?: MatDialogRef<TeacherForm>;
  private formKey: string | null = null;

  // Forms closed because the URL changed: nothing to fix in the URL after.
  private readonly closedByUrl = new WeakSet<MatDialogRef<TeacherForm>>();


  constructor() {

    // Restore the search, filter and page from the URL (e.g. after a refresh).
    this.readStateFromUrl(this.route.snapshot.queryParamMap);

    this.loadTeachers();

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

    // Opened from a link that already has the filter: show it on the phone too.
    this.filtersOpen.set(this.activeFilterCount() > 0);

    // The add / edit form follows ?form=new and ?edit=5 in the URL.
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
  // /teachers?search=..&isActive=..&page=..&pageSize=..
  // Empty values are left out, so the plain list stays /teachers.
  // ?form / ?edit (the open form) are kept as they are: 'merge'.

  private readStateFromUrl(params: ParamMap): void {

    this.search.set(params.get('search') ?? '');

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


  // Loads teachers using the current page, search and filter values.
  loadTeachers(): void {

    this.writeStateToUrl();

    this.lastSearch = this.search().trim();

    this.loadSubscription?.unsubscribe();

    this.isLoading.set(true);
    this.errorMessage.set('');

    const hasQuery =
      !!this.search().trim() ||
      this.statusFilter() !== undefined;

    this.loadSubscription = this.teachersService
      .getTeachers(
        this.pageNumber(),
        this.pageSize(),
        this.search(),
        this.statusFilter()
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.teachers.set([]);
            this.totalCount.set(0);

            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );

            this.isLoading.set(false);
            return;
          }

          const data = response.data;

          // If the current page came back empty and it is not the first page
          // (for example after deactivating its last teacher under a filter),
          // go one page back and reload.
          if (data.items.length === 0 && data.pageNumber > 1) {
            this.pageNumber.set(data.pageNumber - 1);
            this.loadTeachers();
            return;
          }

          this.teachers.set(data.items);
          this.totalCount.set(data.totalCount);

          this.hasQuery.set(hasQuery);
          this.hasLoaded.set(true);

          this.pageNumber.set(data.pageNumber);
          this.pageSize.set(data.pageSize);

          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load teachers:', error);

          this.teachers.set([]);
          this.totalCount.set(0);

          this.errorMessage.set('TEACHERS.ERROR.LOAD_FAILED');

          this.isLoading.set(false);
        },
      });
  }


  // Enter in the search field, or 400ms after the last key.
  onSearch(): void {

    this.pageNumber.set(1);

    this.loadTeachers();
  }


  // The ✕ button of the search field.
  clearSearch(): void {

    this.search.set('');
    this.pageNumber.set(1);

    this.loadTeachers();
  }


  // A key was typed: the list reloads 400ms after the last one.
  onSearchTyping(value: string): void {

    this.searchTyping.next(value);
  }


  // Handles paginator changes and reloads the requested page.
  onPageChange(event: PageEvent): void {

    this.pageNumber.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);

    this.loadTeachers();
  }


  // The filter changed in the search row: applied straight away.
  onFilterChange(values: TeacherFilterValues): void {

    this.statusFilter.set(values.isActive ?? undefined);

    this.pageNumber.set(1);

    this.loadTeachers();
  }


  // "Clear filters" next to the number of results: the list back to "All".
  // The search text stays (it has its own ✕).
  clearFilters(): void {

    this.onFilterChange({ ...EMPTY_TEACHER_FILTER });
  }


  toggleFilters(): void {

    this.filtersOpen.update(open => !open);
  }


  // Opens the teacher details dialog (GET /api/teachers/{teacherId}).
  openTeacherDetails(teacherId: number): void {

    this.dialog.open(TeacherDetails, {
      width: '760px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      // Shared dialog panel (styles.css): full screen on the phone
      panelClass: 'form-dialog',
      data: { teacherId },
    });
  }


  // ===== Add / edit form in the URL =====
  // /teachers?form=new   the add form
  // /teachers?edit=5     the edit form of teacher 5
  // (the search, filter and page stay in the URL next to them)
  //
  // The buttons only put the form in the URL, as a new step in the
  // browser history; syncFormWithUrl() opens it. So:
  //   - "Back" takes it out of the URL: the form closes (after
  //     "Discard changes?" when something was typed) and the list stays
  //   - a refresh or a direct link opens the form again
  //   - ✕, Cancel and saving close the form and take the step back out

  openAddTeacher(): void {

    this.putFormInUrl('new');
  }


  openEditTeacher(teacherId: number): void {

    this.putFormInUrl(String(teacherId));
  }


  // 'new', the edited teacher's id as text, or null for no form.
  private formKeyFromUrl(params: ParamMap): string | null {

    if (params.get('form') === 'new') {
      return 'new';
    }

    const teacherId = this.toPositiveNumber(params.get('edit'));

    return teacherId !== undefined ? String(teacherId) : null;
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

    const teacherId = key === 'new' ? undefined : Number(key);

    const dialogRef = this.dialog.open(TeacherForm, {
      width: '880px',
      maxWidth: '95vw',
      maxHeight: '90vh',

      // Shared form panel (styles.css): full screen on the phone
      panelClass: 'form-dialog',

      // "Back" must not close it by itself: syncFormWithUrl() decides,
      // so "Discard changes?" can still be asked.
      closeOnNavigation: false,

      data: teacherId !== undefined ? { teacherId } : undefined
    });

    this.formDialog = dialogRef;
    this.formKey = key;

    dialogRef
      .afterClosed()
      .subscribe((result?: TeacherFormResult) => {

        // Saved: reload the list and show the backend message, after the
        // URL is right (a "Back" step closes any dialog open during it).
        const afterSave = () => {
          if (result?.success) {
            this.loadTeachers();
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


  // Opens "Reset password" (POST /api/users/{userId}/reset-password).
  // Nothing in the list changes, so no reload after it.
  openResetPassword(teacher: TeacherListDto): void {

    this.dialog.open<ResetPasswordDialog, ResetPasswordDialogData, ResetPasswordResult>(
      ResetPasswordDialog,
      {
        width: '520px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: {
          user: teacher,
          detail: {
            labelKey: 'TEACHERS.TABLE.TEACHER_NUMBER',
            value: teacher.teacherNumber
          }
        }
      }
    );
  }


  // Activates or deactivates a teacher (PATCH /api/teachers/{teacherId}/status).
  toggleTeacherStatus(teacher: TeacherListDto): void {

    this.teachersService
      .updateTeacherStatus(
        teacher.teacherId,
        !teacher.isActive
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.loadTeachers();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to update teacher status:', error);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // Reloads the list after a failed request.
  retry(): void {
    this.loadTeachers();
  }
}
