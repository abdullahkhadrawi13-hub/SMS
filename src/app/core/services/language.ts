import { ApplicationRef, Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { markViewTransition, prefersReducedMotion } from '../../shared/utils/view-transitions';

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
  private appRef = inject(ApplicationRef);

   currentDirection = signal<'ltr' | 'rtl'>('ltr');

  constructor() {

    // حذف القيمة القديمة التي كانت تُحفظ في localStorage
    // حتى لا تبقى آخر لغة مستخدمة عالقة في المتصفح
    localStorage.removeItem(STORAGE_KEY);

    // sessionStorage يبقى فقط طوال فتح التبويب:
    // تحديث الصفحة يحافظ على اللغة، وتشغيل جديد يبدأ باللغة الافتراضية
    const savedLanguage = sessionStorage.getItem(STORAGE_KEY);

    // At start: no transition, the page simply opens in this language.
    if (savedLanguage === 'ar' || savedLanguage === 'en') {
      this.applyLanguage(savedLanguage);
    } else {
      this.applyLanguage(DEFAULT_LANGUAGE);
    }
  }

  // The language button (language-switcher): the sidebar slides to its new
  // side while its text changes language (src/view-transitions.css).
  // Without View Transitions, or with "reduce motion", it switches at once.
  setLanguage(language: AppLanguage) {

    if (
      typeof document.startViewTransition !== 'function'
      || prefersReducedMotion()
      || language === this.getCurrentLanguage()
    ) {
      this.applyLanguage(language);
      return;
    }

    const transition = document.startViewTransition(() => this.switchDuringTransition(language));

    markViewTransition(transition, 'lang');
  }

  // Runs while the browser holds the picture of the old screen. The picture
  // of the new screen is taken as soon as this ends, so the new texts and
  // the sidebar on its new side must be on the screen by then.
  private async switchDuringTransition(language: AppLanguage): Promise<void> {

    // Wait for en.json / ar.json (only the first time; then it is loaded).
    // If it fails, applyLanguage still switches, as before.
    try {
      await firstValueFrom(this.translate.use(language));
    } catch {
      // nothing: the switch below still happens
    }

    this.applyLanguage(language);

    // Draw the change now instead of at Angular's next frame.
    this.appRef.tick();

    // mat-sidenav moves the page beside the sidebar in a second pass.
    await new Promise(resolve => setTimeout(resolve));
    this.appRef.tick();
  }

  private applyLanguage(language: AppLanguage) {

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