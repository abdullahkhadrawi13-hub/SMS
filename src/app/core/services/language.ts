import { ApplicationRef, DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom } from 'rxjs';

import { ViewTransitions } from './view-transitions';

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
  private viewTransitions = inject(ViewTransitions);
  private appRef = inject(ApplicationRef);
  private document = inject(DOCUMENT);

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

  // زر اللغة (app-language-switcher): نفس setLanguage لكن بحركة:
  // الشريط الجانبي (أو اللوحة الكحلية في صفحة الدخول) يتلاشى في مكانه
  // ويظهر في الجهة الأخرى، والباقي يتلاشى (core/services/view-transitions.ts).
  async switchLanguage(language: AppLanguage): Promise<void> {

    // الزر الذي ضُغط (لوحة المفاتيح): يبقى التركيز عليه بعد التبديل
    const focused = this.document.activeElement as HTMLElement | null;

    await this.viewTransitions.run('lang', async () => {

      // الشاشة الجديدة تُلتقط بعد تحميل ملف الترجمة ورسم الصفحة باللغة الجديدة
      await firstValueFrom(this.setLanguage(language));
      this.appRef.tick();

      // جولة رسم ثانية: mat-sidenav ينقل هامش المحتوى إلى الجهة الأخرى بعد
      // الجولة الأولى. بدونها كانت الصفحة تُلتقط في مكانها القديم ثم "تقفز"
      // إليه في نهاية الحركة (مثل refresh)
      await new Promise(resolve => setTimeout(resolve));
      this.appRef.tick();

    });

    if (focused?.isConnected && this.document.activeElement !== focused) {
      focused.focus({ focusVisible: true } as FocusOptions);
    }
  }

  setLanguage(language: AppLanguage): Observable<unknown> {

    // تغيير اللغة (يحمّل ملف الترجمة إذا لم يكن محمّلًا)
    const loaded = this.translate.use(language);

    // حفظ اللغة المختارة للجلسة الحالية فقط
    sessionStorage.setItem(STORAGE_KEY, language);

    // تحديد الاتجاه
    const direction = language === 'ar' ? 'rtl' : 'ltr';

    this.currentDirection.set(direction);

    // تغيير اتجاه الصفحة
    document.documentElement.dir = direction;

    // تحديد اللغة على مستوى HTML
    document.documentElement.lang = language;

    return loaded;
  }

  getCurrentLanguage() {
    return this.translate.getCurrentLang();
  }

  getDirection() {
    return this.currentDirection();
  }
}