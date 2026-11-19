import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { SIDEBAR_MENU } from '../../../layouts/dashboard-layout/sidebar/sidebar-menu';
import { PageHeader } from '../page-header/page-header';
import { StateCard } from '../state-card/state-card';


// "Coming soon" (navy & gold, 17 Nov 2026): the pages that are not built
// yet, and any address with no page (the '**' route).
// The page header with the page name, then the shared state card (empty)
// in its own white card, with a way back to the dashboard.
// The texts are translated (SHARED.COMING_SOON).
@Component({
  selector: 'app-coming-soon',
  imports: [
    MatButtonModule,
    MatIconModule,
    PageHeader,
    RouterLink,
    StateCard,
    TranslatePipe
  ],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.css',
})
export class ComingSoon {

  private readonly router = inject(Router);

  // The address of the page. One '**' route serves /timetable, /results…,
  // so the component stays the same between them: follow every navigation.
  private readonly url = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  // The page name = the name of its sidebar link
  // (/timetable → "SIDEBAR.TIMETABLE", /attendance → "SIDEBAR.ATTENDANCE").
  // An address with no link (a typo, an old link) is titled "قريبًا".
  readonly titleKey = computed(() => {

    const firstSegment = this.url().split(/[?#]/)[0].split('/')[1] ?? '';

    const link = SIDEBAR_MENU.find(item => item.route === '/' + firstSegment);

    return link?.label ?? 'SHARED.COMING_SOON.TITLE';
  });
}
