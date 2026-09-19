import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

import { User } from '../../../../core/services/user';
import { Language } from '../../../../core/services/language';

@Component({
  selector: 'app-teacher-dashboard',
  imports: [
    TranslatePipe,
    MatIconModule
  ],
  templateUrl: './teacher-dashboard.html',
  styleUrl: './teacher-dashboard.css'
})
export class TeacherDashboard {

  private userService = inject(User);
  private languageService = inject(Language);

  get teacherName(): string {
    const user = this.userService.getUser();

    if (!user) {
      return '';
    }

    const language = this.languageService.getCurrentLanguage();

    if (language === 'ar') {
      return `${user.firstNameAr} ${user.fatherNameAr}`;
    }

    return `${user.firstNameEn} ${user.fatherNameEn}`;
  }
}