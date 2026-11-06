import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';


// What the card is showing.
export type StateCardType = 'loading' | 'empty' | 'error';


// The shared loading / empty / error card (spec: "الحالات").
// One component for every place that loads data, so these states look
// the same everywhere and live inside the card they belong to.
//
//   loading   spinner + one line ("Loading students...")
//   empty     big icon + title + one line that says the next step
//             ("Choose a class first" is also "empty", with its own icon)
//   error     small red icon + one line + "Retry" button
//
// Usage:
//   <app-state-card type="loading" [message]="'STUDENTS.LOADING' | translate" />
//
//   <app-state-card
//     type="empty"
//     icon="school"
//     [title]="'STUDENTS.NO_STUDENTS' | translate"
//     [message]="'STUDENTS.NO_STUDENTS_DESCRIPTION' | translate"
//   >
//     <a actions mat-stroked-button routerLink="…">…</a>   optional buttons
//   </app-state-card>
//
//   <app-state-card
//     type="error"
//     [message]="errorMessage() | translate"
//     (retry)="loadPage()"
//   />
//
// - framed:  true  = its own white card with a border (alone on the page)
//            false = no border, inside a card that already exists
//                    (a table card, a tab, a list card)
// - size:    'compact' = shorter (160px instead of 240px), for tabs and
//            small lists.
// - The "Retry" button is drawn by the card (SHARED.STATE_CARD.RETRY).
//   showRetry = false hides it (an error with nothing to retry).
//
// Texts arrive already translated, like app-page-header.
// Colours: src/tokens.css (--state-icon for the empty icon, --bad for error).
@Component({
  selector: 'app-state-card',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './state-card.html',
  styleUrl: './state-card.css',
  host: {
    '[class.framed]': 'framed()',
    '[class.compact]': "size() === 'compact'",
    '[class.is-loading]': "type() === 'loading'",
    '[class.is-empty]': "type() === 'empty'",
    '[class.is-error]': "type() === 'error'",
    '[attr.role]': "type() === 'loading' ? 'status' : type() === 'error' ? 'alert' : null",
  },
})
export class StateCard {

  readonly type = input<StateCardType>('empty');

  // Material Symbols name. Used by "empty" (the error icon is fixed).
  readonly icon = input('inbox');

  // Bold line. Usually for "empty"; an error may have one too
  // ("Teacher not found" + the reason under it).
  readonly title = input<string | null | undefined>('');

  // The one line under the title (or alone, for loading and error).
  readonly message = input<string | null | undefined>('');

  readonly framed = input(true);

  readonly size = input<'default' | 'compact'>('default');

  readonly showRetry = input(true);

  readonly retry = output<void>();
}
