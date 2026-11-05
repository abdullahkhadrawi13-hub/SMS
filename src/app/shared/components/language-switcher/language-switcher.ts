import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Language } from '../../../core/services/language';

type AppLanguage = 'ar' | 'en';

// The name of each language, always written in that language.
const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  ar: 'العربية',
  en: 'English'
};


// One button that switches straight to the other language.
// It shows the name of the language it switches TO ("English" in the
// Arabic UI, "العربية" in the English UI), marked with lang="..."
// so screen readers say it in that language.
//
// Used in the navbar and on the login pages (auth-layout).
// Its colours can be changed from outside with these CSS variables
// (auth-layout does this on the navy panel):
//   --lang-btn-ink, --lang-btn-icon, --lang-btn-hover-bg,
//   --lang-btn-hover-ink, --lang-btn-focus
@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css'
})
export class LanguageSwitcher {

  private readonly languageService = inject(Language);

  // currentDirection is a signal, so the button updates at once.
  private readonly currentLanguage = computed<AppLanguage>(() =>
    this.languageService.currentDirection() === 'rtl' ? 'ar' : 'en'
  );

  // The language the button switches to.
  readonly otherLanguage = computed<AppLanguage>(() =>
    this.currentLanguage() === 'ar' ? 'en' : 'ar'
  );

  readonly otherLanguageName = computed(() =>
    LANGUAGE_NAMES[this.otherLanguage()]
  );

  switchLanguage(): void {
    this.languageService.setLanguage(this.otherLanguage());
  }
}