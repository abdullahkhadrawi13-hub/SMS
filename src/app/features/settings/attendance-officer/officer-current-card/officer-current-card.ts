import { Component, computed, inject, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherListDto } from '../../../../core/models/teacher';
import { Language } from '../../../../core/services/language';

import { toOfficerTeacherView } from '../officer-view';


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

  private readonly language = inject(Language);

  // ===== Input (the officer is loaded by the parent page) =====

  // The current attendance officer, or null when none is assigned.
  readonly officer = input<TeacherListDto | null>(null);


  // Name and avatar of the officer in the language of the page
  // (null when none is assigned).
  readonly view = computed(() => {

    const teacher = this.officer();

    return teacher
      ? toOfficerTeacherView(teacher, this.language.currentDirection() === 'rtl')
      : null;
  });
}
