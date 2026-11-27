import { Injectable, inject, signal } from '@angular/core';

import { ViewTransitions } from './view-transitions';

export type AppTheme = 'light' | 'dark';

// الوضع الذي يبدأ به المشروع عند كل تشغيل جديد.
// غيّره إلى 'dark' إذا أردت أن يبدأ المشروع بالوضع الداكن.
const DEFAULT_THEME: AppTheme = 'light';

const STORAGE_KEY = 'theme';

// الوضع الفاتح / الداكن، بنفس طريقة Language:
// يُحفظ في sessionStorage فقط، فتحديث الصفحة يحافظ على الوضع،
// وتشغيل جديد يبدأ بالوضع الافتراضي (لا يتبع إعداد الجهاز).
// الألوان نفسها في src/tokens.css: الفاتح في :root، والداكن في
// :root[data-theme="dark"]. الخدمة تُحمَّل في app.ts، فصفحة الدخول تتبع الوضع أيضًا.
@Injectable({
  providedIn: 'root'
})
export class Theme {

  private readonly viewTransitions = inject(ViewTransitions);

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

    // <html data-theme="light|dark">: منه تأخذ tokens.css ألوان الوضع
    document.documentElement.dataset['theme'] = theme;
  }

  // The switch in the navbar: the whole screen fades to the other theme
  // (--dur-theme-fade, core/services/view-transitions.ts).
  toggleTheme(): void {
    const next: AppTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.viewTransitions.run('theme', () => this.setTheme(next));
  }
}
