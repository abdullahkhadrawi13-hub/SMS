import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import { SubjectsForm } from '../subjects-form/subjects-form';

@Component({
  selector: 'app-subjects-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './subjects-header.html',
  styleUrl: './subjects-header.css',
})
export class SubjectsHeader {

  // Reference used to open the subject form dialog.
  private readonly dialog = inject(MatDialog);


  // Opens the subject form dialog.
  openSubjectForm(): void {
    this.dialog.open(SubjectsForm, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
  }
}