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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslatePipe } from '@ngx-translate/core';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  SubjectDto,
  SubjectsService,
} from '../../../../core/services/subjects';
import { ApiMessageService } from '../../../../core/services/api-message';
import { ActionResult } from '../../../../shared/services/action-result';

import { SubjectsSearch } from '../subjects-search/subjects-search';
import {
  SubjectFilterValues,
  SubjectsFilter,
} from '../subjects-filter/subjects-filter';
import { SubjectsTable } from '../subjects-table/subjects-table';
import {
  SubjectFormData,
  SubjectsForm,
} from '../subjects-form/subjects-form';


// The "Subjects list" tab: every school subject (SMS API Reference, section 6).
// GET /api/subjects has no search or status filter,
// so the search and the filter are applied here, on the loaded list.
@Component({
  selector: 'app-subjects-list-tab',
  imports: [
    SubjectsSearch,
    SubjectsTable,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-list-tab.html',
  styleUrl: './subjects-list-tab.css',
})
export class SubjectsListTab implements OnInit {

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


  // Opens the subject filter dialog and applies the selected status.
  openFilter(): void {

    const current: SubjectFilterValues = {
      isActive: this.statusFilter() ?? null,
    };

    this.dialog
      .open(SubjectsFilter, {
        width: '420px',
        data: current,
      })
      .afterClosed()
      .subscribe((result?: SubjectFilterValues) => {

        // Ignore the result when the dialog is cancelled or closed.
        if (!result) {
          return;
        }

        this.statusFilter.set(result.isActive ?? undefined);
      });
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
      .open(SubjectsForm, {
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
