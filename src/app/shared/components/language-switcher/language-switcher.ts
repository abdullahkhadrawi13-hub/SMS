import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { Language } from '../../../core/services/language';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css'
})
export class LanguageSwitcher {

  private languageService = inject(Language);

  get currentLanguage(): 'ar' | 'en' {
    return this.languageService.getCurrentLanguage() as 'ar' | 'en';
  }

  changeLanguage(language: 'ar' | 'en') {
    this.languageService.setLanguage(language);
  }
}