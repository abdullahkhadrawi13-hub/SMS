import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
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

  // Error message key shown above the table (translated here).
  readonly errorMessage = input<string | null>(null);

  // Pagination state (pageNumber is 1-based).
  readonly totalCount = input(0);
  readonly pageNumber = input(1);
  readonly pageSize = input(10);

  // ===== Outputs (the parent page performs the actual actions) =====

  readonly pageChange = output<PageEvent>();
  readonly editSection = output<Section>();
  readonly toggleStatus = output<Section>();

  // Columns displayed in the sections table.
  readonly displayedColumns = [
    'className',
    'section',
    'studentCount',
    'status',
    'actions'
  ];


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