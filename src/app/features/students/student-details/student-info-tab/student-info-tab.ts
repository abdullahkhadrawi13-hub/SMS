import { Component, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { getRoleTranslationKey } from '../../../../core/models/user-role';
import { Student } from '../../../../core/models/student';

import {
  getStudentClassName,
  getStudentNameAr,
  getStudentNameEn,
  getStudentSectionName
} from '../student-details';

// The "Details" tab of the student page (/students/:id, no ?tab).
// Personal, academic and account information, read only.
// It does not load anything: the page gives it the student it loaded.
@Component({
  selector: 'app-student-info-tab',
  imports: [
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './student-info-tab.html',
  styleUrl: './student-info-tab.css'
})
export class StudentInfoTab {

  readonly student = input.required<Student>();

  // The phone number and the "Account Information" section are for
  // Admin and AssistantPrincipal only (hidden from a teacher).
  // Given by the page, which takes it from the Permissions service.
  readonly canViewPrivateInfo = input(false);

  // The shared helpers, kept here under these names
  // so the template can call them.
  readonly getStudentNameAr = getStudentNameAr;
  readonly getStudentNameEn = getStudentNameEn;
  readonly getClassName = getStudentClassName;
  readonly getSectionName = getStudentSectionName;
  readonly getRoleTranslationKey = getRoleTranslationKey;
}
