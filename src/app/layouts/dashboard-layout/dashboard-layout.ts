import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Navbar } from './navbar/navbar';
import { Sidebar } from './sidebar/sidebar';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../core/services/language';
import { AttendanceAccessService } from '../../core/services/attendance-access';

// The phone layout starts under 720px.
// The same width is used in the CSS files of the layout, the navbar and
// the sidebar: @media (max-width: 719.98px). Change them together.
export const PHONE_QUERY = '(max-width: 719.98px)';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    MatSidenavModule,
    Navbar,
    Sidebar,
    RouterOutlet,
    TranslatePipe
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css'
})
export class DashboardLayout implements OnInit {

  languageService = inject(Language);

  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly breakpoints = inject(BreakpointObserver);

  // true when the screen is narrower than 720px.
  readonly isPhone = signal(this.breakpoints.isMatched(PHONE_QUERY));

  // Computer: always open. Phone: closed until the menu button is pressed.
  readonly sidebarOpened = signal(!this.isPhone());

  // The page area (<main>), where "تخطَّ إلى المحتوى" sends the focus.
  private readonly mainContent = viewChild.required<ElementRef<HTMLElement>>('mainContent');

  constructor() {

    // When the screen crosses 720px (rotating a tablet, resizing the
    // window), the sidebar goes back to its default for that size.
    this.breakpoints
      .observe(PHONE_QUERY)
      .pipe(takeUntilDestroyed())
      .subscribe(result => {
        this.isPhone.set(result.matches);
        this.sidebarOpened.set(!result.matches);
      });

  }

  ngOnInit(): void {

    // عند فتح التطبيق (Admin / AssistantPrincipal / Teacher):
    // GET /api/attendance/my-access
    // الـ Sidebar يعتمد على النتيجة لإظهار أو إخفاء قسم الحضور والغياب.
    // (للطالب وولي الأمر لا يُرسل أي طلب)
    this.attendanceAccess.load().subscribe();

  }

  // The menu button of the navbar (phone only).
  openSidebar(): void {
    this.sidebarOpened.set(true);
  }

  // "تخطَّ إلى المحتوى": the next Tab goes to the first thing in the page.
  // Handled here, not by the #main-content address, so the router does not
  // see a new URL.
  skipToContent(event: Event): void {
    event.preventDefault();
    this.mainContent().nativeElement.focus();
  }

  // A link in the sidebar was clicked. On the phone the sidebar closes,
  // even when the link is the page already open (no navigation happens then).
  onSidebarLinkClick(): void {
    if (this.isPhone()) {
      this.sidebarOpened.set(false);
    }
  }

}
