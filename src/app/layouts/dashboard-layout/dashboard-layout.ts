import { Component, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
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