import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { map } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SubjectsService } from '../../../../core/services/subjects';
import { ApiMessageService } from '../../../../core/services/api-message';
import { ActionResult } from '../../../../shared/services/action-result';
import { SearchField } from '../../../../shared/components/search-field/search-field';
import { pluralKey } from '../../../../shared/utils/plural';
import { PHONE_QUERY } from '../../../../layouts/dashboard-layout/dashboard-layout';

import { SubjectsCatalogTable } from '../subjects-catalog-table/subjects-catalog-table';
import {
  SubjectFormData,
  SubjectsCatalogForm,
} from '../subjects-catalog-form/subjects-catalog-form';
import { SubjectDto } from '../../../../core/models/subject';


// The "Subjects list" tab: every school subject (SMS API Reference, section 6).
// GET /api/subjects has no search or status filter,
// so the search and the filter are applied here, on the loaded list,
// straight away (no Apply button, no filter dialog).
// The search and the status list sit on the page background above the table,
// like the students and teachers lists (styles.css: "List page").
@Component({
  selector: 'app-subjects-catalog-tab',
  imports: [
    SearchField,
    SubjectsCatalogTable,
    MatIconModule,
    MatDialogModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-catalog-tab.html',
  styleUrl: './subjects-catalog-tab.css',
})
export class SubjectsCatalogTab implements OnInit {

  private readonly subjectsService = inject(SubjectsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);


  // Shows the edit and activate / deactivate actions (Admin only).
  readonly canManage = input(false);


  // Every subject returned by the API.
  readonly subjects = signal<SubjectDto[]>([]);

  readonly isLoading = signal(false);

  // Error message (API message or translation key) shown instead of the table.
  readonly errorMessage = signal('');

  // Current search text (Arabic or English name).
  readonly search = signal('');

  // Current status filter (undefined = all).
  readonly statusFilter = signal<boolean | undefined>(undefined);

  // true while a search or a filter is applied
  // (the table then shows "no matching subject" instead of "no subjects").
  readonly isFiltered = computed(
    () => this.search().trim() !== '' || this.statusFilter() !== undefined
  );

  // "3 subjects match the search": only after a search or a filter,
  // with the right Arabic plural form.
  readonly resultsKey = computed(() =>
    this.isFiltered() && !this.isLoading() && !this.errorMessage()
      ? pluralKey('SUBJECTS.CATALOG_FILTER.MATCHING', this.filteredSubjects().length)
      : null
  );


  // ===== Phone: the filter opens under the search =====

  // Under 720px: the status list hides behind a "Filter" button,
  // and the table becomes a two-line list.
  readonly isPhone = toSignal(
    inject(BreakpointObserver).observe(PHONE_QUERY).pipe(map(r => r.matches)),
    { initialValue: false }
  );

  readonly filtersOpen = signal(false);


  // The subjects shown in the table after the search and the filter.
  readonly filteredSubjects = computed(() => {

    const text = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.subjects().filter(subject => {

      const matchesText =
        !text
        || subject.subjectAr.toLowerCase().includes(text)
        || subject.subjectEn.toLowerCase().includes(text);

      const matchesStatus =
        status === undefined || subject.isActive === status;

      return matchesText && matchesStatus;
    });
  });


  ngOnInit(): void {
    this.loadSubjects();
  }


  // GET /api/subjects
  loadSubjects(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.subjectsService
      .getSubjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.subjects.set([]);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );
            this.isLoading.set(false);
            return;
          }

          // Sorted by subject number, like the other lists of the site.
          this.subjects.set(
            [...response.data].sort((a, b) => a.subjectId - b.subjectId)
          );

          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load subjects:', error);

          this.subjects.set([]);
          this.errorMessage.set('SUBJECTS.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        },
      });
  }


  // The status list: "" = all, "true" = active, "false" = inactive.
  onStatusChange(value: string): void {
    this.statusFilter.set(value === '' ? undefined : value === 'true');
  }


  // Opens the subject form in add mode (POST /api/subjects).
  // Called by the page header "Add subject" button.
  openAddSubject(): void {
    this.openForm({});
  }


  // Opens the subject form in edit mode (PUT /api/subjects/{id}).
  openEditSubject(subject: SubjectDto): void {
    this.openForm({ subject });
  }


  // Activates or deactivates a subject (PATCH /api/subjects/{id}/status).
  toggleSubjectStatus(subject: SubjectDto): void {

    this.subjectsService
      .updateSubjectStatus(subject.subjectId, !subject.isActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.loadSubjects();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to update subject status:', error);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // The form saves the subject itself and closes with { success: true }.
  private openForm(data: SubjectFormData): void {

    this.dialog
      .open(SubjectsCatalogForm, {
        width: '500px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data,
      })
      .afterClosed()
      .subscribe((result) => {

        if (result?.success) {
          this.loadSubjects();
        }
      });
  }
}
