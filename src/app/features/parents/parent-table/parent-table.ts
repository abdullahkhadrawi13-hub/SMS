import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import {
  getRelationshipTranslationKey,
  ParentChildDto,
  ParentDto
} from '../../../core/models/parent';
import { getFirstName, getFullName, isArabicPage } from '../parents';


// How many children are shown as chips in the "Children" column.
// The rest are shown as one "+N" chip (their names are in its tooltip).
const VISIBLE_CHILDREN = 2;


@Component({
  selector: 'app-parent-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './parent-table.html',
  styleUrl: './parent-table.css',
})
export class ParentTable {

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // Parents of the current page (each one with their children).
  readonly parents = input<ParentDto[]>([]);

  // Loading and error state of the list.
  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Pagination state (pageNumber is 1-based).
  readonly totalCount = input(0);
  readonly pageNumber = input(1);
  readonly pageSize = input(10);

  // Shows the edit, link and activate / deactivate actions (Admin only).
  readonly canManage = input(false);

  // ===== Loading modes (same as the teachers table) =====

  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.parents().length === 0
  );

  readonly isRefreshing = computed(() =>
    this.isLoading() && this.parents().length > 0
  );


  // ===== Outputs (the parent page performs the actual actions) =====

  readonly retry = output<void>();
  readonly pageChange = output<PageEvent>();
  readonly viewParent = output<number>();
  readonly editParent = output<number>();
  readonly linkChild = output<ParentDto>();
  readonly toggleStatus = output<ParentDto>();
  readonly resetPassword = output<ParentDto>();


  // Columns displayed in the parents table.
  readonly displayedColumns = [
    'name',
    'loginId',
    'phoneNumber',
    'children',
    'status',
    'actions',
  ];

  readonly getFullName = getFullName;
  readonly getFirstName = getFirstName;
  readonly getRelationshipTranslationKey = getRelationshipTranslationKey;


  // The children shown as chips.
  visibleChildren(parent: ParentDto): ParentChildDto[] {
    return parent.children.slice(0, VISIBLE_CHILDREN);
  }

  // How many children are not shown as chips (0 = none).
  hiddenCount(parent: ParentDto): number {
    return Math.max(parent.children.length - VISIBLE_CHILDREN, 0);
  }

  // The first names of the hidden children, for the tooltip of "+N".
  hiddenNames(parent: ParentDto): string {
    return parent.children
      .slice(VISIBLE_CHILDREN)
      .map(child => getFirstName(child))
      .join(isArabicPage() ? '، ' : ', ');
  }
}
