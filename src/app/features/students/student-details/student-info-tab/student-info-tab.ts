import { Component, computed, inject, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { Student, StudentStatus } from '../../../../core/models/student';
import { Language } from '../../../../core/services/language';
import { getArabicName, getEnglishName } from '../../../../shared/utils/person-name';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

import {
  getStudentClassName,
  getStudentSectionName
} from '../student-details';

// The "Details" tab of the student page (/students/:id, no ?tab).
// Two cards, read only:
//   "Student details": the names, the student number, the phone,
//                      the class and the section
//   "Account":         login ID, account status, password status
//                      (Admin and AssistantPrincipal only)
// It does not load anything: the page gives it the student it loaded.
@Component({
  selector: 'app-student-info-tab',
  imports: [
    MatIconModule,
    TranslatePipe,
    StatusBadge,
  ],
  templateUrl: './student-info-tab.html',
  styleUrl: './student-info-tab.css'
})
export class StudentInfoTab {

  private readonly language = inject(Language);

  readonly student = input.required<Student>();

  // The phone number and the "Account" card are for
  // Admin and AssistantPrincipal only (hidden from a teacher).
  // Given by the page, which takes it from the Permissions service.
  readonly canViewPrivateInfo = input(false);

  // The names, class and section shown in the card
  // (class and section in the language of the page).
  readonly view = computed(() => {
    const student = this.student();
    const isArabic = this.language.currentDirection() === 'rtl';

    return {
      nameAr: getArabicName(student),
      nameEn: getEnglishName(student),
      className: getStudentClassName(student, isArabic),
      sectionName: getStudentSectionName(student, isArabic),
    };
  });

  readonly isGraduated = computed(
    () => this.student().studentStatus === StudentStatus.Graduated
  );
}
