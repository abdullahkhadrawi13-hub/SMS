import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import {
  getRelationshipTranslationKey,
  ParentDto,
  ParentRelationship
} from '../../../core/models/parent';
import { Language } from '../../../core/services/language';
import { RangePaginatorIntl } from '../../../core/services/paginator-intl';
import {
  getFirstName,
  getFullName,
  getInitials,
  getShortName
} from '../../../shared/utils/person-name';
import { pluralKey } from '../../../shared/utils/plural';
import { StateCard } from '../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { getAvatarTone, getListSeparator } from '../parents';


// How many children are shown as chips in the "Children" column.
// The rest are shown as one "+N" chip (their names are in its tooltip).
const VISIBLE_CHILDREN = 2;


// One child chip of the "Children" column: "سارة · أب".
export interface ChildChip {
  studentId: number;
  firstName: string;
  relationship: ParentRelationship;
  relationshipKey: string;
}


// One parent as the list shows it: the API data plus the names
// in the language of the page (computed once, not on every change check).
export interface ParentRow extends ParentDto {
  fullName: string;
  shortName: string;
  initials: string;
  avatarTone: number;

  // The first children, shown as chips.
  chips: ChildChip[];

  // The children not shown as chips: how many, and their first names
  // (the tooltip of "+N").
  hiddenCount: number;
  hiddenNames: string;

  // "3 أبناء" (the second line of a parent on the phone).
  childrenCountKey: string;
}


@Component({
  selector: 'app-parent-table',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
    StateCard,
    StatusBadge,
  ],
  // The look is the shared "Data table" in styles.css (.data-card, .data-table…);
  // only the children chips are in parent-table.css.
  templateUrl: './parent-table.html',
  styleUrl: './parent-table.css',
  // "1–10 من 42" under this table, like the students and teachers tables.
  providers: [
    { provide: MatPaginatorIntl, useClass: RangePaginatorIntl }
  ],
})
export class ParentTable {

  private readonly language = inject(Language);

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

  // Shows "Edit", "Link a child", "Reset password" and
  // "Activate / Deactivate" (Admin only). "View" is shown for everyone.
  readonly canManage = input(false);

  // The last list used a search or a filter: the empty state says
  // "no parents match" instead of "no parents added yet".
  readonly hasQuery = input(false);

  // Under 720px: a two-line list instead of the table.
  readonly isPhone = input(false);

  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the table.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.parents().length === 0
  );

  // Reload (page change, search, filter, after an edit):
  // the old rows stay on the screen with a thin progress bar on top,
  // so the table and the paginator do not disappear and jump.
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

  // Columns displayed in the parents table (the parent first).
  readonly displayedColumns = [
    'name',
    'loginId',
    'phoneNumber',
    'children',
    'status',
    'actions'
  ];


  // The parents with their names in the language of the page.
  // Recomputed when the list or the language changes.
  readonly rows = computed<ParentRow[]>(() => {

    const isArabic = this.language.currentDirection() === 'rtl';

    return this.parents().map(parent => {

      const hidden = parent.children.slice(VISIBLE_CHILDREN);

      return {
        ...parent,
        fullName: getFullName(parent, isArabic),
        shortName: getShortName(parent, isArabic),
        initials: getInitials(parent, isArabic),
        // The same colour for the same parent, everywhere.
        avatarTone: getAvatarTone(parent.parentId),

        chips: parent.children
          .slice(0, VISIBLE_CHILDREN)
          .map(child => ({
            studentId: child.studentId,
            firstName: getFirstName(child, isArabic),
            relationship: child.relationship,
            relationshipKey: getRelationshipTranslationKey(child.relationship)
          })),

        hiddenCount: hidden.length,
        hiddenNames: hidden
          .map(child => getFirstName(child, isArabic))
          .join(getListSeparator(isArabic)),

        childrenCountKey: pluralKey('PARENTS.COUNT.CHILDREN', parent.children.length)
      };

    });

  });

}
