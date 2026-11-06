import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

import { LanguageSwitcher } from '../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    TranslatePipe,
    MatIconModule,
    LanguageSwitcher
  ],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css'
})
export class AuthLayout {}
