import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class Language {

  private translate = inject(TranslateService);

  constructor() {
    const savedLanguage = localStorage.getItem('language');

    if (savedLanguage === 'ar' || savedLanguage === 'en') {
      this.setLanguage(savedLanguage);
    } else {
      this.setLanguage('en');
    }
  }

  setLanguage(language: 'ar' | 'en') {

    // تغيير اللغة
    this.translate.use(language);

    // حفظ اللغة المختارة
    localStorage.setItem('language', language);

    // تغيير اتجاه الصفحة
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

    // تحديد اللغة على مستوى HTML
    document.documentElement.lang = language;
  }

  getCurrentLanguage() {
    return this.translate.getCurrentLang();
  }
}