import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import { ClassForm, ClassFormData } from '../class-form/class-form';
import { Section } from '../section';
import { SectionsService } from '../../../core/services/sections';

@Component({
  selector: 'app-class-list',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatPaginatorModule,
    MatDialogModule,
    TranslatePipe
  ],
  templateUrl: './class-list.html',
  styleUrl: './class-list.css'
})
export class ClassList {

  private readonly dialog = inject(MatDialog);
  private readonly sectionsService = inject(SectionsService);

  readonly displayedColumns = [
    'className',
    'section',
    'studentCount',
    'status',
    'actions'
  ];

  sections: Section[] = [];

  totalCount = 0;
  pageNumber = 1;
  pageSize = 10;

  ngOnInit(): void {
    this.loadSections();
  }

  loadSections(): void {
    this.sectionsService.getSections({
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    }).subscribe({
      next: (response) => {
        this.sections = response.data.items;
        this.totalCount = response.data.totalCount;
      },
      error: (error) => {
        console.error('Failed to load sections:', error);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageNumber = event.pageIndex + 1;
    this.pageSize = event.pageSize;

    this.loadSections();
  }

  openAddClassDialog(): void {
    const data: ClassFormData = {
      mode: 'add'
    };

    this.dialog.open(ClassForm, {
      width: '500px',
      maxWidth: '95vw',
      data
    });
  }

  openEditClassDialog(section: Section): void {
    const data: ClassFormData = {
      mode: 'edit',
      classId: section.classId,
      sectionAr: section.sectionAr,
      sectionEn: section.sectionEn
    };

    this.dialog.open(ClassForm, {
      width: '500px',
      maxWidth: '95vw',
      data
    });
  }
}