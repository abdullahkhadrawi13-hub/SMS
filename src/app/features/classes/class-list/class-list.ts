import { Component, inject, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import {
  SectionForm,
  SectionFormData
} from '../section-form/section-form';

import { ClassForm } from '../class-form/class-form';

import {
  ClassFilter,
  ClassFilterData
} from '../class-filter/class-filter';

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

  readonly sections = signal<Section[]>([]);

  readonly totalCount = signal(0);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);

  ngOnInit(): void {
    this.loadSections();
  }

  loadSections(): void {
    this.sectionsService.getSections({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize()
    }).subscribe({
      next: (response) => {
        this.sections.set(response.data.items);
        this.totalCount.set(response.data.totalCount);
      },
      error: (error) => {
        console.error('Failed to load sections:', error);
        this.sections.set([]);
        this.totalCount.set(0);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageNumber.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);

    this.loadSections();
  }


  // Add Class
  openAddClassDialog(): void {

    const dialogRef = this.dialog.open(ClassForm, {
      width: '500px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((result) => {

      if (result) {
        console.log('Class form result:', result);

        // سيتم استبداله بطلب الـAPI لاحقًا
      }

    });

  }


  // Add Section
  openAddSectionDialog(): void {

    const data: SectionFormData = {
      mode: 'add'
    };

    const dialogRef = this.dialog.open(SectionForm, {
      width: '500px',
      maxWidth: '95vw',
      data
    });

    dialogRef.afterClosed().subscribe((result) => {

      if (result) {
        console.log('Section form result:', result);

        // سيتم استبداله بطلب الـAPI لاحقًا
      }

    });

  }


  // Edit Section
  openEditSectionDialog(section: Section): void {

    const data: SectionFormData = {
      mode: 'edit',
      classId: section.classId,
      sectionAr: section.sectionAr,
      sectionEn: section.sectionEn
    };

    const dialogRef = this.dialog.open(SectionForm, {
      width: '500px',
      maxWidth: '95vw',
      data
    });

    dialogRef.afterClosed().subscribe((result) => {

      if (result) {
        console.log('Section edit result:', result);

        // سيتم استبداله بطلب الـAPI لاحقًا
      }

    });

  }


  // Filter
  openFilterDialog(): void {

    const dialogRef = this.dialog.open(ClassFilter, {
      width: '500px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(
      (filters: ClassFilterData | undefined) => {

        if (!filters) {
          return;
        }

        console.log('Selected filters:', filters);

        // سيتم ربط الفلترة بالـAPI لاحقًا
      }
    );

  }


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