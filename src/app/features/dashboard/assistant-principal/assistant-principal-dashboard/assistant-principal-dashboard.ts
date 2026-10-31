import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

import { User } from '../../../../core/services/user';
import { Language } from '../../../../core/services/language';
import { getShortName } from '../../../../shared/utils/person-name';

@Component({
  selector: 'app-assistant-principal-dashboard',
  imports: [
    TranslatePipe,
    MatIconModule
  ],
  templateUrl: './assistant-principal-dashboard.html',
  styleUrl: './assistant-principal-dashboard.css'
})
export class AssistantPrincipalDashboard {

  private userService = inject(User);
  private languageService = inject(Language);

  // First name + family name for the welcome: "محمد العمري" / "Mohammad Al-Omari"
  // (the same name as the navbar, from shared/utils/person-name.ts).
  get assistantPrincipalName(): string {
    const user = this.userService.getUser();

    if (!user) {
      return '';
    }

    const isArabic = this.languageService.getCurrentLanguage() === 'ar';

    return getShortName(user, isArabic);
  }
}