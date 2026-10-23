import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { filter } from 'rxjs';

import { TranslatePipe } from '@ngx-translate/core';

import { ParentsService } from '../../../core/services/parents';
import { ApiMessageService } from '../../../core/services/api-message';
import { Permissions } from '../../../core/services/permissions';
import { ActionResult } from '../../../shared/services/action-result';
import { getRoleTranslationKey } from '../../../core/models/user-role';
import { StudentStatus } from '../../../core/models/student';
import {
  getRelationshipTranslationKey,
  ParentChildDto,
  ParentDto
} from '../../../core/models/parent';

import {
  ParentLinkChild,
  ParentLinkChildDialogData,
  ParentLinkChildResult,
} from '../parent-link-child/parent-link-child';
import {
  ParentUnlinkConfirm,
  ParentUnlinkConfirmData,
} from '../parent-unlink-confirm/parent-unlink-confirm';
import {
  getArabicName,
  getClassSection,
  getEnglishName,
  getFirstName,
  getFullName,
  getInitials
} from '../parents';


// Data passed when the details dialog is opened.
export interface ParentDetailsDialogData {
  parentId: number;
}

// changed: a child was linked or unlinked (the page reloads the list).
export interface ParentDetailsResult {
  changed: boolean;
}


// Parent details: the account, the personal information and the children.
// Same layout as the teacher details; the children come first because
// they are the most important part of a parent.
// Admin links and unlinks children here; AssistantPrincipal only reads.
@Component({
  selector: 'app-parent-details',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './parent-details.html',
  styleUrl: './parent-details.css',
})
export class ParentDetails {

  private readonly parentsService = inject(ParentsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly permissions = inject(Permissions);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef =
    inject(MatDialogRef<ParentDetails, ParentDetailsResult>);

  private readonly data =
    inject<ParentDetailsDialogData>(MAT_DIALOG_DATA);


  // Link / unlink buttons: Admin only.
  readonly canManage = this.permissions.canManageParents;

  // The parent returned by the API.
  readonly parent = signal<ParentDto | null>(null);

  readonly isLoading = signal(false);

  // Error message (API message or translation key).
  readonly errorMessage = signal('');

  // The child being unlinked (its button shows a spinner).
  readonly unlinkingId = signal<number | null>(null);

  // True once a child was linked or unlinked.
  private changed = false;


  readonly getFullName = getFullName;
  readonly getArabicName = getArabicName;
  readonly getEnglishName = getEnglishName;
  readonly getInitials = getInitials;
  readonly getClassSection = getClassSection;
  readonly getRelationshipTranslationKey = getRelationshipTranslationKey;
  readonly getRoleTranslationKey = getRoleTranslationKey;

  readonly StudentStatus = StudentStatus;


  constructor() {

    // Closing with the backdrop or Escape still tells the page
    // whether a child was linked or unlinked.
    this.dialogRef.disableClose = true;

    this.dialogRef.backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.close());

    this.dialogRef.keydownEvents()
      .pipe(
        filter(event => event.key === 'Escape'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.close());

    this.loadParent();
  }


  // Loads the parent (GET /api/parents/{parentId}).
  loadParent(): void {

    const parentId = this.data.parentId;

    if (!parentId || parentId <= 0) {
      this.errorMessage.set('PARENTS.DETAILS.INVALID_ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.parentsService
      .getParent(parentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success || !response.data) {

            this.parent.set(null);

            this.errorMessage.set(
              this.apiMessageService.getMessage(response) ||
              'PARENTS.DETAILS.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          this.parent.set(response.data);
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load parent:', error);

          this.parent.set(null);

          // A missing parent returns 404 with a normal body ("Parent not found.").
          this.errorMessage.set(
            error.status === 404
              ? this.apiMessageService.getErrorMessage(error)
              : 'PARENTS.DETAILS.LOAD_FAILED'
          );

          this.isLoading.set(false);
        },
      });
  }


  // Opens "Link a child"; the dialog returns the updated parent.
  openLinkChild(): void {

    const parent = this.parent();

    if (!parent) {
      return;
    }

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
          this.parent.set(result.parent);
          this.changed = true;
        }
      });
  }


  // Asks first, then removes the link (DELETE /api/parents/{id}/students/{studentId}).
  confirmUnlink(child: ParentChildDto): void {

    const parent = this.parent();

    if (!parent || this.unlinkingId() !== null) {
      return;
    }

    this.dialog
      .open<ParentUnlinkConfirm, ParentUnlinkConfirmData, boolean>(
        ParentUnlinkConfirm,
        {
          width: '480px',
          maxWidth: '95vw',
          data: {
            parentName: getFullName(parent),
            childName: getFullName(child),
            childFirstName: getFirstName(child),
          },
        }
      )
      .afterClosed()
      .subscribe((confirmed) => {

        if (confirmed) {
          this.unlink(parent, child);
        }
      });
  }


  private unlink(parent: ParentDto, child: ParentChildDto): void {

    this.unlinkingId.set(child.studentId);

    this.parentsService
      .unlinkChild(parent.parentId, child.studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.unlinkingId.set(null);

          if (!response.success) {
            this.actionResult.show(
              'error',
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.changed = true;

          // The API Reference does not say what DELETE returns:
          // use the updated parent when it comes back, otherwise
          // remove the child here.
          if (response.data?.children) {
            this.parent.set(response.data);
          } else {
            this.parent.update(current => current && {
              ...current,
              children: current.children.filter(
                item => item.studentId !== child.studentId
              ),
            });
          }

          this.actionResult.show(
            'success',
            this.apiMessageService.getMessage(response)
          );
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to unlink the child:', error);

          this.unlinkingId.set(null);

          this.actionResult.show(
            'error',
            this.apiMessageService.getErrorMessage(error)
          );
        },
      });
  }


  close(): void {
    this.dialogRef.close({ changed: this.changed });
  }

  retry(): void {
    this.loadParent();
  }
}
