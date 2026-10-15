import { Component, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherListDto } from '../../../../core/models/teacher';

import { getTeacherName } from '../teacher-name';


@Component({
  selector: 'app-officer-current-card',
  imports: [
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './officer-current-card.html',
  styleUrl: './officer-current-card.css',
})
export class OfficerCurrentCard {

  // ===== Input (the officer is loaded by the parent page) =====

  // The current attendance officer, or null when none is assigned.
  readonly officer = input<TeacherListDto | null>(null);


  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherListDto): string {
    return getTeacherName(teacher);
  }
}
