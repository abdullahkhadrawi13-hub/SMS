import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { StudentStatusBadge } from '../../../../shared/components/student-status/student-status';

import { StudentInfo } from '../../shared/dashboard.models';


// "معلوماتي" on the Student dashboard: the student number, the class and
// section, and the student's status (the shared app-student-status).
@Component({
  selector: 'app-student-info-card',
  imports: [
    TranslatePipe,
    StudentStatusBadge,
  ],
  templateUrl: './student-info-card.html',
  styleUrl: './student-info-card.css',
})
export class StudentInfoCard {

  private readonly language = inject(Language);

  readonly info = input.required<StudentInfo>();

  // "الثامن · ب" / "Grade 8 · B"
  readonly classAndSection = computed(() => {
    const info = this.info();

    return this.language.currentDirection() === 'rtl'
      ? `${info.classNameAr} · ${info.sectionNameAr}`
      : `${info.classNameEn} · ${info.sectionNameEn}`;
  });
}
