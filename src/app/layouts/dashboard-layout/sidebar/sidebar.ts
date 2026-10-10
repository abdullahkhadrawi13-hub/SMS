import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { User } from '../../../core/services/user';
import { AttendanceAccessService } from '../../../core/services/attendance-access';
import { MenuItem, SIDEBAR_MENU } from './sidebar-menu';

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
  private attendanceAccess = inject(AttendanceAccessService);

  menuItems = SIDEBAR_MENU;

  get visibleMenuItems() {
    const role =this.userService.getRole();

    if (role === null) {
      return [];
    }

    return this.menuItems.filter(item =>
      item.roles.includes(role) &&
      !this.isHidden(item)
    );
  }

  // قسم الحضور والغياب يُخفى عن المعلم إذا لم يكن مسؤول الحضور
  // (GET /api/attendance/my-access أعاد canRecord: false).
  // الطالب وولي الأمر يبقى القسم ظاهرًا لهما ويفتح صفحة Coming Soon.
  private isHidden(item: MenuItem): boolean {
    return (
      item.route === '/attendance' &&
      this.attendanceAccess.hideFromSidebar()
    );
  }
}