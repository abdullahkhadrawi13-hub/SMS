import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslatePipe } from '@ngx-translate/core';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PageEvent } from '@angular/material/paginator';

import { ParentsService } from '../../../core/services/parents';
import { ApiMessageService } from '../../../core/services/api-message';
import { Permissions } from '../../../core/services/permissions';
import { ActionResult } from '../../../shared/services/action-result';
import { ParentDto } from '../../../core/models/parent';

import { ParentHeader } from '../parent-header/parent-header';
import { ParentSearch } from '../parent-search/parent-search';
import {
  ParentFilter,
  ParentFilterValues,
} from '../parent-filter/parent-filter';
import { ParentTable } from '../parent-table/parent-table';
import {
  ParentForm,
  ParentFormDialogData,
  ParentFormResult,
} from '../parent-form/parent-form';
import {
  ParentDetails,
  ParentDetailsDialogData,
  ParentDetailsResult,
} from '../parent-details/parent-details';
import {
  ParentLinkChild,
  ParentLinkChildDialogData,
  ParentLinkChildResult,
} from '../parent-link-child/parent-link-child';


// Parents page (API Reference, section 14).
// Admin manages parents; AssistantPrincipal reads only.
// The page owns the list and opens every dialog of the section.
@Component({
  selector: 'app-parents-page',
  imports: [
    ParentHeader,
    ParentSearch,
    ParentTable,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslatePipe,
  ],
  templateUrl: './parents-page.html',
  styleUrl: './parents-page.css',
})
export class ParentsPage {

  // Service used to communicate with the Parents API.
  private readonly parentsService = inject(ParentsService);

  // Used to stop pending requests when the page is destroyed.
  private readonly destroyRef = inject(DestroyRef);

  // Reference used to open the dialogs (filter, form, details, link).
  private readonly dialog = inject(MatDialog);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  // Shows the success / error result dialog after an action.
  private readonly actionResult = inject(ActionResult);

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);


  // Only the Admin can add, edit, link, activate or deactivate parents.
  // The Assistant Principal can only read.
  readonly canManage = this.permissions.canManageParents;


  // Parents of the current page (each one with their children).
  readonly parents = signal<ParentDto[]>([]);

  // Total number of parents matching the current search and filter.
  readonly totalCount = signal(0);

  // Current page number (1-based, like the API).
  readonly pageNumber = signal(1);

  // Current number of rows displayed per page.
  readonly pageSize = signal(10);

  // Current search text (name, login ID or phone number).
  readonly search = signal('');

  // Stores the currently selected account status filter.
  readonly statusFilter = signal<boolean | undefined>(undefined);

  // Indicates whether the list is currently loading.
  readonly isLoading = signal(false);

  // Error message (API message or translation key) shown instead of the table.
  readonly errorMessage = signal('');


  constructor() {

    // Load the first page when the page is opened.
    this.loadParents();
  }


  // Loads parents using the current page, search and filter values.
  loadParents(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.parentsService
      .getParents({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        search: this.search(),
        isActive: this.statusFilter(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.parents.set([]);
            this.totalCount.set(0);

            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );

            this.isLoading.set(false);
            return;
          }

          const data = response.data;

          // If the current page came back empty and it is not the first page
          // (for example after filtering), go one page back and reload.
          if (data.items.length === 0 && data.pageNumber > 1) {
            this.pageNumber.set(data.pageNumber - 1);
            this.loadParents();
            return;
          }

          this.parents.set(data.items);
          this.totalCount.set(data.totalCount);
          this.pageNumber.set(data.pageNumber);
          this.pageSize.set(data.pageSize);

          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load parents:', error);

          this.parents.set([]);
          this.totalCount.set(0);

          this.errorMessage.set('PARENTS.ERROR.LOAD_FAILED');

          this.isLoading.set(false);
        },
      });
  }


  // Runs when the user submits or clears the search field.
  onSearch(value: string): void {

    this.search.set(value);
    this.pageNumber.set(1);

    this.loadParents();
  }


  // Handles paginator changes and reloads the requested page.
  onPageChange(event: PageEvent): void {

    this.pageNumber.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);

    this.loadParents();
  }


  // Opens the filter dialog and applies the selected values.
  openFilter(): void {

    const current: ParentFilterValues = {
      isActive: this.statusFilter() ?? null,
    };

    this.dialog
      .open(ParentFilter, {
        width: '420px',
        data: current,
      })
      .afterClosed()
      .subscribe((result?: ParentFilterValues) => {

        // Ignore the result when the dialog is cancelled or closed.
        if (!result) {
          return;
        }

        this.statusFilter.set(
          result.isActive ?? undefined
        );

        this.pageNumber.set(1);

        this.loadParents();
      });
  }


  // Opens the parent details (GET /api/parents/{parentId}).
  // Children can be linked and unlinked there, so the list is
  // reloaded when something changed.
  openParentDetails(parentId: number): void {

    this.dialog
      .open<ParentDetails, ParentDetailsDialogData, ParentDetailsResult>(
        ParentDetails,
        {
          width: '850px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: { parentId },
        }
      )
      .afterClosed()
      .subscribe((result) => {

        if (result?.changed) {
          this.loadParents();
        }
      });
  }


  // Opens the form in add mode (POST /api/parents).
  openAddParent(): void {
    this.openForm({});
  }


  // Opens the form in edit mode (PUT /api/parents/{parentId}).
  openEditParent(parentId: number): void {
    this.openForm({ parentId });
  }


  private openForm(data: ParentFormDialogData): void {

    this.dialog
      .open<ParentForm, ParentFormDialogData, ParentFormResult>(
        ParentForm,
        {
          width: '850px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data,
        }
      )
      .afterClosed()
      .subscribe((result) => {

        if (result?.success) {
          this.loadParents();
          return;
        }

        // Add form: the phone number belongs to an existing parent and the
        // admin chose "Link a student to this account" instead of adding.
        if (result?.linkToParent) {
          this.openLinkChild(result.linkToParent);
        }
      });
  }


  // Opens the "Link a child" dialog (POST /api/parents/{parentId}/students).
  openLinkChild(parent: ParentDto): void {

    this.dialog
      .open<ParentLinkChild, ParentLinkChildDialogData, ParentLinkChildResult>(
        ParentLinkChild,
        {
          width: '520px',
          maxWidth: '95vw',
          data: { parent },
        }
      )
      .afterClosed()
      .subscribe((result) => {

        if (result?.parent) {
          this.loadParents();
        }
      });
  }


  // Activates or deactivates a parent (PATCH /api/parents/{parentId}/status).
  toggleParentStatus(parent: ParentDto): void {

    this.parentsService
      .updateParentStatus(
        parent.parentId,
        !parent.isActive
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

          this.loadParents();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to update parent status:', error);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  // Reloads the list after a failed request.
  retry(): void {
    this.loadParents();
  }
}
