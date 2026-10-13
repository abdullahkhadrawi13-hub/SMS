import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslatePipe } from '@ngx-translate/core';

import { Section } from '../section';

@Component({
  selector: 'app-sections-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './sections-table.html',
  styleUrl: './sections-table.css',
})
export class SectionsTable {

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // Sections of the current page.
  readonly sections = input<Section[]>([]);

  // id of the section whose status is being changed right now
  // (used to prevent repeated clicks).
  readonly togglingSectionId = input<number | null>(null);

  // true while a page of sections is loading.
  readonly isLoading = input(false);

  // Error message key shown above the table (translated here).
  readonly errorMessage = input<string | null>(null);

  // Pagination state (pageNumber is 1-based).
  readonly totalCount = input(0);
  readonly pageNumber = input(1);
  readonly pageSize = input(10);

  // True for users allowed to manage sections (edit, activate, deactivate).
  // The actions column has only these two actions,
  // so the whole column is hidden when this is false.
  readonly canManage = input(false);

  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the table.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.sections().length === 0
  );

  // Reload (page change, after activate / deactivate):
  // the old rows stay on the screen with a thin progress bar on top,
  // so the table and the paginator do not disappear and jump.
  readonly isRefreshing = computed(() =>
    this.isLoading() && this.sections().length > 0
  );

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly pageChange = output<PageEvent>();
  readonly editSection = output<Section>();
  readonly toggleStatus = output<Section>();

  // Columns displayed in the sections table.
  // The actions column is added only for users allowed to manage sections.
  readonly displayedColumns = computed(() => {

    const columns = [
      'className',
      'section',
      'studentCount',
      'status'
    ];

    if (this.canManage()) {
      columns.push('actions');
    }

    return columns;
  });


  getClassName(section: Section): string {

    const language = document.documentElement.lang;

    return language === 'ar'
      ? section.classNameAr
      : section.classNameEn;

  }


  getSectionName(section: Section): string {

    const language = document.documentElement.lang;

    return language === 'ar'
      ? section.sectionAr
      : section.sectionEn;

  }

}