import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

import { User } from '../../../../core/services/user';
import { Language } from '../../../../core/services/language';

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

  get assistantPrincipalName(): string {
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