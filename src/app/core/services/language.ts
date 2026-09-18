import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class Language {

  private translate = inject(TranslateService);

  private currentDirection = signal<'ltr' | 'rtl'>('ltr');

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

    // تحديد الاتجاه
    const direction = language === 'ar' ? 'rtl' : 'ltr';

    this.currentDirection.set(direction);

    // تغيير اتجاه الصفحة
    document.documentElement.dir = direction;

    // تحديد اللغة على مستوى HTML
    document.documentElement.lang = language;
  }

  getCurrentLanguage() {
    return this.translate.getCurrentLang();
  }

  getDirection() {
    return this.currentDirection();
  }
}