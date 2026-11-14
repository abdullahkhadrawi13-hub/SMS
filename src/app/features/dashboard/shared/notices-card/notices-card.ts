import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';

import { DashboardNotice } from '../dashboard.models';


// "يحتاج انتباهك" on the Teacher and Parent dashboards: a list the
// dashboard builds itself (DashboardNotice), with the same look as
// app-attention-card on the Admin dashboard.
// An empty list shows "لا شيء يحتاج انتباهك الآن".
//
// For now the links have no action: they get their routes when the
// dashboard is connected to the backend.
@Component({
  selector: 'app-notices-card',
  imports: [
    TranslatePipe,
    MatIconModule,
  ],
  templateUrl: './notices-card.html',
  styleUrl: './notices-card.css',
})
export class NoticesCard {

  readonly notices = input.required<DashboardNotice[]>();

  readonly icons: Record<DashboardNotice['tone'], string> = {
    warn: 'warning_amber',
    info: 'info',
    bad: 'cancel',
  };
}
