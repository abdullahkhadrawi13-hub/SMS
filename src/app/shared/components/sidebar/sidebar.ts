import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { User } from '../../../core/services/user';
import { SIDEBAR_MENU } from '../../config/sidebar-menu';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {

  private userService = inject(User);

  menuItems = SIDEBAR_MENU;

  get visibleMenuItems() {
    const role = this.userService.getRole();

    if (role === null) {
      return [];
    }

    return this.menuItems.filter(item =>
      item.roles.includes(role)
    );
  }
}