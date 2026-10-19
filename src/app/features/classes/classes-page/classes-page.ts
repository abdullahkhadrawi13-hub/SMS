import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { SchoolClass } from '../../../core/models/school-class';
import { SchoolClassesService } from '../../../core/services/school-classes';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { Permissions } from '../../../core/services/permissions';
import { ActionResult } from '../../../shared/services/action-result';

import { ClassesHeader } from '../classes-header/classes-header';
import { ClassesGrid } from '../classes-grid/classes-grid';
import {
  ClassesForm,
  ClassFormData,
  ClassFormResult
} from '../classes-form/classes-form';

@Component({
  selector: 'app-classes-page',
  imports: [
    ClassesHeader,
    ClassesGrid,
    MatDialogModule,
  ],
  templateUrl: './classes-page.html',
  styleUrl: './classes-page.css',
})
export class ClassesPage {

  // Service used to communicate with the SchoolClasses API.
  private readonly classesService = inject(SchoolClassesService);

  // Used to stop pending requests when the page is destroyed.
  private readonly destroyRef = inject(DestroyRef);

  // Opens the add / edit class dialog.
  private readonly dialog = inject(MatDialog);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  // Shows the success / error result dialog after an action.
  private readonly actionResult = inject(ActionResult);

  // Current UI direction, passed to the dialog (RTL for Arabic, LTR for English).
  private readonly language = inject(Language);

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);

  // Only the Admin can add, edit, activate or deactivate classes.
  // The Assistant Principal can only read.
  readonly canManage = this.permissions.canManageClasses;

  // All the school's classes, sorted by level.
  readonly classes = signal<SchoolClass[]>([]);

  // Indicates whether the list is currently loading.
  readonly isLoading = signal(false);

  // Error message (API message or translation key) shown instead of the cards.
  readonly errorMessage = signal('');

  // id of the class whose status is being changed right now
  // (prevents repeated clicks).
  readonly togglingClassId = signal<number | null>(null);

  constructor() {
    // Load the first page when the page is opened.
    this.loadClasses();
  }

  // A school has only a few classes, so they are loaded in one request
  // and shown without pagination.
  // The list endpoint is paged, so we ask for one large page.
  private static readonly ALL_CLASSES_PAGE_SIZE = 100;

  // Loads all classes (GET /api/schoolclasses?pageNumber=1&pageSize=100).
  // The API has no search or status filter for classes.
  loadClasses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.classesService
      .getSchoolClasses(1, ClassesPage.ALL_CLASSES_PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success) {
            this.classes.set([]);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );
            this.isLoading.set(false);
            return;
          }

          // Show the classes in school order (by level).
          const sorted = [...response.data.items].sort(
            (a, b) => a.level - b.level
          );

          this.classes.set(sorted);
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load classes:', error);

          this.classes.set([]);
          this.errorMessage.set('CLASSES.ERROR.LOAD_FAILED');
          this.isLoading.set(false);
        }
      });
  }

  // Reloads the list after a failed request.
  retry(): void {
    this.loadClasses();
  }

  // Opens the class form in add mode (POST /api/schoolclasses).
  openAddClass(): void {
    this.openClassForm({});
  }

  // Opens the class form in edit mode (PUT /api/schoolclasses/{id}).
  openEditClass(schoolClass: SchoolClass): void {
    this.openClassForm({ schoolClass });
  }

  // Activates or deactivates a class (PATCH /api/schoolclasses/{id}/status).
  toggleClassStatus(schoolClass: SchoolClass): void {

    if (this.togglingClassId() !== null) {
      return;
    }

    this.togglingClassId.set(schoolClass.schoolClassId);

    this.classesService
      .updateSchoolClassStatus(
        schoolClass.schoolClassId,
        !schoolClass.isActive
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.togglingClassId.set(null);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          // Reload instead of relying on response.data,
          // because the API does not document what this endpoint returns.
          this.loadClasses();

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to update class status:', error);

          this.togglingClassId.set(null);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        }
      });
  }

  // The form sends the request itself and closes only after a successful save.
  private openClassForm(data: ClassFormData): void {
    this.dialog
      .open<ClassesForm, ClassFormData, ClassFormResult>(ClassesForm, {
        width: '500px',
        maxWidth: '95vw',
        direction: this.language.currentDirection(),
        data
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.success) {
          this.loadClasses();
        }
      });
  }

}
