import { Component, DestroyRef, ElementRef, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { User } from '../../../core/services/user';
import { AttendanceAccessService } from '../../../core/services/attendance-access';
import { UserRole } from '../../../core/models/user-role';
import {
  MenuGroupInfo,
  MenuItem,
  SIDEBAR_GROUPS,
  SIDEBAR_MENU
} from './sidebar-menu';

// One link as the sidebar shows it.
interface SidebarLink extends MenuItem {
  soon: boolean;
}

// One group with the links the current user can see.
interface SidebarGroup extends MenuGroupInfo {
  links: SidebarLink[];
}

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

  constructor() {

    // Listened to on the way down (capture), before the link's own
    // routerLink sees the click: on the phone the click stops here.
    // A click with Ctrl / Shift / the middle button (a new tab) is left alone.
    const host: HTMLElement = inject(ElementRef).nativeElement;

    const onClick = (event: MouseEvent) => {

      if (!this.holdNavigation()) {
        return;
      }

      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }

      const link = (event.target as Element).closest<HTMLElement>('a[data-route]');

      if (!link) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      this.navigateAfterClose.emit(link.dataset['route']!);
    };

    host.addEventListener('click', onClick, true);

    inject(DestroyRef).onDestroy(() =>
      host.removeEventListener('click', onClick, true)
    );
  }

  // A link was clicked: on the phone, dashboard-layout closes the sidebar.
  // (Also when the link is the page already open, where no navigation happens.)
  readonly linkClick = output<void>();

  // The phone: a link does not open its page by itself. The sidebar sends
  // the link's address here instead, and dashboard-layout closes the
  // sidebar first, then opens the page (so the page's motion does not
  // start under a sidebar that is still sliding away).
  readonly holdNavigation = input(false);
  readonly navigateAfterClose = output<string>();

  // The groups of the current user, each with its visible links.
  // A group with no visible link is left out, heading and all.
  // Recomputed when the user or the attendance access changes.
  readonly groups = computed<SidebarGroup[]>(() => {

    const role = this.userService.getRole();

    if (role === null) {
      return [];
    }

    const visible = SIDEBAR_MENU.filter(item =>
      item.roles.includes(role) &&
      !this.isHidden(item)
    );

    return SIDEBAR_GROUPS
      .map(group => ({
        ...group,
        links: visible
          .filter(item => (item.group ?? null) === group.id)
          .map(item => ({
            ...item,
            soon: this.isComingSoon(item, role)
          }))
      }))
      .filter(group => group.links.length > 0);
  });

  // قسم الحضور والغياب يُخفى عن المعلم إذا لم يكن مسؤول الحضور
  // (GET /api/attendance/my-access أعاد canRecord: false).
  // الطالب وولي الأمر يبقى القسم ظاهرًا لهما ويفتح صفحة Coming Soon.
  private isHidden(item: MenuItem): boolean {
    return (
      item.route === '/attendance' &&
      this.attendanceAccess.hideFromSidebar()
    );
  }

  // The page of this link is not ready yet for this role.
  private isComingSoon(item: MenuItem, role: UserRole): boolean {

    if (item.comingSoon === true) {
      return true;
    }

    return item.comingSoon?.includes(role) ?? false;
  }
}