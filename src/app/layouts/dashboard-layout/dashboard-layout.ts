import { Component, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Navbar } from './navbar/navbar';
import { Sidebar } from './sidebar/sidebar';
import { RouterOutlet } from '@angular/router';

import { Language } from '../../core/services/language';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    MatSidenavModule,
    Navbar,
    Sidebar,
    RouterOutlet
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css'
})
export class DashboardLayout {

  languageService = inject(Language);

}