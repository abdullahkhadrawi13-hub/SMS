import { Component, computed, inject, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { Theme } from '../../../core/services/theme';


// The light / dark switch in the navbar: a sky with a sun in the light theme,
// a navy night with a moon in the dark. A real switch (role="switch"):
// its label stays "الوضع الداكن" and aria-checked says whether it is on.
// The CSS draws and moves everything from aria-checked (no JS animation).
//
// A parent can change these CSS variables (the navbar does this on navy
// on the phone):
//   --theme-btn-hover-bg, --theme-btn-focus, --theme-btn-night-line
@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [MatTooltipModule, TranslatePipe],
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.css'
})
export class ThemeSwitcher {

  private readonly themeService = inject(Theme);

  // true = a 44px touch area (the navbar on the phone); false = 36px.
  readonly compact = input(false);

  readonly isDark = computed(() => this.themeService.currentTheme() === 'dark');

  switchTheme(): void {
    this.themeService.toggleTheme();
  }
}
