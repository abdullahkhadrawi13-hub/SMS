import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class Language {

  private translate = inject(TranslateService);

  constructor() {
    this.setLanguage('ar');
  }

  setLanguage(language: 'ar' | 'en') {

    // تغيير اللغة
    this.translate.use(language);

    // تغيير اتجاه الصفحة
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

    // اختياري: نحدد اللغة على مستوى HTML
    document.documentElement.lang = language;
  }

  getCurrentLanguage() {
    return this.translate.getCurrentLang();
  }
}