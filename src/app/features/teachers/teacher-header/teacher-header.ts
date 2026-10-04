import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherForm } from '../teacher-form/teacher-form';

@Component({
  selector: 'app-teacher-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './teacher-header.html',
  styleUrl: './teacher-header.css',
})
export class TeacherHeader {

  // Reference used to open teacher dialogs.
  private readonly dialog = inject(MatDialog);

  // Opens the teacher form dialog.
  openTeacherForm(): void {
    this.dialog.open(TeacherForm, {
      width: '850px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
  }
}