import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { StateCard } from '../state-card/state-card';


// "Coming soon" (navy & gold, 17 Nov 2026): the pages that are not built
// yet, and any address with no page (the '**' route).
// The shared state card (empty) in its own white card, with a way back
// to the dashboard. The texts are translated (SHARED.COMING_SOON).
@Component({
  selector: 'app-coming-soon',
  imports: [
    MatButtonModule,
    MatIconModule,
    RouterLink,
    StateCard,
    TranslatePipe
  ],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.css',
})
export class ComingSoon {}
