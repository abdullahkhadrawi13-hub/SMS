import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

type AppLanguage = 'ar' | 'en';

// اللغة التي يبدأ بها المشروع عند كل تشغيل جديد.
// غيّرها إلى 'ar' إذا أردت أن يبدأ المشروع بالعربية.
const DEFAULT_LANGUAGE: AppLanguage = 'en';

const STORAGE_KEY = 'language';

@Injectable({
  providedIn: 'root'
})
export class Language {

  private translate = inject(TranslateService);

   currentDirection = signal<'ltr' | 'rtl'>('ltr');

  constructor() {

    // حذف القيمة القديمة التي كانت تُحفظ في localStorage
    // حتى لا تبقى آخر لغة مستخدمة عالقة في المتصفح
    localStorage.removeItem(STORAGE_KEY);

    // sessionStorage يبقى فقط طوال فتح التبويب:
    // تحديث الصفحة يحافظ على اللغة، وتشغيل جديد يبدأ باللغة الافتراضية
    const savedLanguage = sessionStorage.getItem(STORAGE_KEY);

    if (savedLanguage === 'ar' || savedLanguage === 'en') {
      this.setLanguage(savedLanguage);
    } else {
      this.setLanguage(DEFAULT_LANGUAGE);
    }
  }

  setLanguage(language: AppLanguage) {

    // تغيير اللغة
    this.translate.use(language);

    // حفظ اللغة المختارة للجلسة الحالية فقط
    sessionStorage.setItem(STORAGE_KEY, language);

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