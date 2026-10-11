import { Component, inject } from '@angular/core';

import { Permissions } from '../../../core/services/permissions';

import { ClassesHeader } from '../classes-header/classes-header';

@Component({
  selector: 'app-classes-page',
  imports: [ClassesHeader],
  templateUrl: './classes-page.html',
  styleUrl: './classes-page.css',
})
export class ClassesPage {

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);

  // Only the Admin can add, edit, activate or deactivate classes.
  // The Assistant Principal can only read.
  readonly canManage = this.permissions.canManageClasses;

  // Handles the add-class action from the page header.
  openAddClass(): void {
    // Class form will be connected later.
  }

}