import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

// الوضع الذي يبدأ به المشروع عند كل تشغيل جديد.
// غيّره إلى 'dark' إذا أردت أن يبدأ المشروع بالوضع الداكن.
const DEFAULT_THEME: AppTheme = 'light';

const STORAGE_KEY = 'theme';

// الوضع الفاتح / الداكن، بنفس طريقة Language:
// يُحفظ في sessionStorage فقط، فتحديث الصفحة يحافظ على الوضع،
// وتشغيل جديد يبدأ بالوضع الافتراضي (لا يتبع إعداد الجهاز).
//
// ملاحظة: ألوان الوضع الداكن لم تُضف بعد إلى src/tokens.css،
// فتبديل الوضع الآن يغيّر الأيقونة و data-theme على <html> فقط، لا الألوان.
@Injectable({
  providedIn: 'root'
})
export class Theme {

  readonly currentTheme = signal<AppTheme>(DEFAULT_THEME);

  constructor() {

    const savedTheme = sessionStorage.getItem(STORAGE_KEY);

    if (savedTheme === 'light' || savedTheme === 'dark') {
      this.setTheme(savedTheme);
    } else {
      this.setTheme(DEFAULT_THEME);
    }
  }

  setTheme(theme: AppTheme): void {

    this.currentTheme.set(theme);

    // حفظ الوضع المختار للجلسة الحالية فقط
    sessionStorage.setItem(STORAGE_KEY, theme);

    // <html data-theme="light|dark">: منه ستأخذ tokens.css الألوان الداكنة لاحقًا
    document.documentElement.dataset['theme'] = theme;
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }
}
