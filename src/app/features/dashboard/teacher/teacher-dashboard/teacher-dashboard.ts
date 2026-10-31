import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

import { User } from '../../../../core/services/user';
import { Language } from '../../../../core/services/language';
import { getShortName } from '../../../../shared/utils/person-name';

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

  // First name + family name for the welcome: "محمد العمري" / "Mohammad Al-Omari"
  // (the same name as the navbar, from shared/utils/person-name.ts).
  get teacherName(): string {
    const user = this.userService.getUser();

    if (!user) {
      return '';
    }

    const isArabic = this.languageService.getCurrentLanguage() === 'ar';

    return getShortName(user, isArabic);
  }
}