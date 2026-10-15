import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherListDto } from '../../../../core/models/teacher';

import { getTeacherName } from '../teacher-name';


@Component({
  selector: 'app-officer-save-bar',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './officer-save-bar.html',
  styleUrl: './officer-save-bar.css',
})
export class OfficerSaveBar {

  // ===== Inputs (the selection is owned by the parent page) =====

  // The teacher selected in the list (not saved yet).
  readonly teacher = input.required<TeacherListDto>();

  // True while the parent page is saving: the buttons cannot be clicked.
  readonly isSaving = input(false);


  // ===== Outputs (the parent page cancels or saves the selection) =====

  // Emitted when the Admin clicks Cancel.
  readonly cancelSelection = output<void>();

  // Emitted when the Admin clicks Save.
  readonly saveSelection = output<void>();


  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherListDto): string {
    return getTeacherName(teacher);
  }
}