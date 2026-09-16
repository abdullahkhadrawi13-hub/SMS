import { Component, inject } from '@angular/core';
import { Language } from '../../../core/services/language';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css'
})
export class LanguageSwitcher {

  private languageService = inject(Language);

  changeLanguage(language: 'ar' | 'en') {
    this.languageService.setLanguage(language);
  }

}