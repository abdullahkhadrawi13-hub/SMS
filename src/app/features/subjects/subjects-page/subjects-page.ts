import { Component, inject, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { Permissions } from '../../../core/services/permissions';

import { SubjectsTab } from '../subject';
import { SubjectsHeader } from '../subjects-header/subjects-header';
import { ClassSubjects } from '../class-subjects/class-subjects';
import { SubjectsCatalog } from '../subjects-catalog/subjects-catalog';

@Component({
  selector: 'app-subjects-page',
  imports: [
    SubjectsHeader,
    ClassSubjects,
    SubjectsCatalog,
    MatIconModule,
    MatTabsModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-page.html',
  styleUrl: './subjects-page.css',
})
export class SubjectsPage {

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);

  // Only the Admin can add, edit, activate or deactivate
  // subjects and the subjects of a section.
  // The Assistant Principal can only read.
  readonly canManage = this.permissions.canManageSubjects;

  // The open tab (Admin and Assistant Principal).
  // Both tabs stay alive while switching, so the chosen
  // term / class / section is not lost.
  readonly activeTab = signal<SubjectsTab>('class');

  // The subjects list tab: the header's "Add subject" button opens its form.
  private readonly catalog = viewChild(SubjectsCatalog);


  selectTab(tab: SubjectsTab): void {
    this.activeTab.set(tab);
  }


  // Header "Add subject" button (subjects list tab only).
  openAddSubject(): void {
    this.catalog()?.openAddSubject();
  }
}
