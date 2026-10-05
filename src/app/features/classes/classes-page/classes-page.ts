import { Component } from '@angular/core';

import { ClassesHeader } from '../classes-header/classes-header';

@Component({
  selector: 'app-classes-page',
  imports: [ClassesHeader],
  templateUrl: './classes-page.html',
  styleUrl: './classes-page.css',
})
export class ClassesPage {

  // Handles the add-class action from the page header.
  openAddClass(): void {
    // Class form will be connected later.
  }

}