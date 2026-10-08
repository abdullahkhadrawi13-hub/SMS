import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import {
  SectionsForm,
  SectionFormData
} from '../sections-form/sections-form';

import {
  SectionsFilter,
  SectionFilterData
} from '../sections-filter/sections-filter';

import { SectionsHeader } from '../sections-header/sections-header';
import { SectionsTable } from '../sections-table/sections-table';

import { Section } from '../section';
import { SectionsService } from '../../../core/services/sections';
import { ApiMessageService } from '../../../core/services/api-message';
import { ActionResult } from '../../../shared/services/action-result';

@Component({
  selector: 'app-sections-page',
  imports: [
    SectionsHeader,
    SectionsTable,

    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslatePipe
  ],
  templateUrl: './sections-page.html',
styleUrl: './sections-page.css'
})
export class SectionsPage {

  private readonly dialog = inject(MatDialog);
  private readonly sectionsService = inject(SectionsService);

  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);

  private readonly destroyRef = inject(DestroyRef);

  readonly sections = signal<Section[]>([]);

  // id الشعبة التي يجري تغيير حالتها حاليًا (لمنع الضغط المتكرر)
  readonly togglingSectionId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

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

  // Add Section
  openAddSectionDialog(): void {

    const data: SectionFormData = {
      mode: 'add'
    };

    const dialogRef = this.dialog.open(SectionsForm, {
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
      classNameAr: section.classNameAr,
      classNameEn: section.classNameEn,
      sectionAr: section.sectionAr,
      sectionEn: section.sectionEn
    };

    const dialogRef = this.dialog.open(SectionsForm, {
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

  // Activate / Deactivate
  toggleSectionStatus(section: Section): void {

  if (this.togglingSectionId() !== null) {
    return;
  }

  this.togglingSectionId.set(section.sectionId);
  this.errorMessage.set(null);

  this.sectionsService
    .updateSectionStatus(
      section.sectionId,
      !section.isActive
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (response) => {
        this.togglingSectionId.set(null);

        if (!response.success) {
          this.actionResult.error(
            this.apiMessageService.getMessage(response)
          );
          return;
        }

        this.loadSections();

        this.actionResult.success(
          this.apiMessageService.getMessage(response)
        );
      },

      error: (error) => {
        console.error(
          'Failed to update section status:',
          error
        );

        this.togglingSectionId.set(null);

        this.actionResult.error(
          this.apiMessageService.getErrorMessage(error)
        );
      }
    });

}

  // Filter
  openFilterDialog(): void {

    const dialogRef = this.dialog.open(SectionsFilter, {
      width: '500px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(
      (filters: SectionFilterData | undefined) => {

        if (!filters) {
          return;
        }

        console.log('Selected filters:', filters);

        // سيتم ربط الفلترة بالـAPI لاحقًا
      }
    );

  }

}