import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { Theme } from '../../../core/services/theme';


// One icon button that switches straight to the other theme
// (like the language button): a moon in the light theme, a sun in the dark.
// Its label names the theme it switches TO ("الوضع الداكن" in the light theme).
//
// Used in the navbar. Its colours can be changed from outside with these
// CSS variables (the navbar does this on navy on the phone):
//   --theme-btn-ink, --theme-btn-hover-bg, --theme-btn-hover-ink, --theme-btn-focus
@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.css'
})
export class ThemeSwitcher {

  private readonly themeService = inject(Theme);

  // true = 44 × 44 (the navbar on the phone); false = 36 × 36.
  readonly compact = input(false);

  readonly isDark = computed(() => this.themeService.currentTheme() === 'dark');

  readonly icon = computed(() => this.isDark() ? 'light_mode' : 'dark_mode');

  readonly labelKey = computed(() =>
    this.isDark() ? 'NAVBAR.THEME_LIGHT' : 'NAVBAR.THEME_DARK'
  );

  switchTheme(): void {
    this.themeService.toggleTheme();
  }
}
