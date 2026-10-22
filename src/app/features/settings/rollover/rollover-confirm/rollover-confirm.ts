import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { RolloverTally } from '../rollover';


// What the Admin typed, sent to POST /api/rollover by the parent page.
export interface RolloverConfirmation {
  adminPassword: string;
  confirmYearName: string | null;
}

// One tile of "What will happen".
interface TallyTile {
  labelKey: string;
  count: number;
  tone: string;
}


// Step 3: what will happen, then the guards of POST /api/rollover:
// the Admin's password (always), and for a new year the year name.
// The password is never kept: it is cleared as soon as it is sent.
@Component({
  selector: 'app-rollover-confirm',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './rollover-confirm.html',
  styleUrl: './rollover-confirm.css',
})
export class RolloverConfirm {

  readonly tally = input.required<RolloverTally>();
  readonly isNewYear = input(false);

  // The old year's name the Admin must type (new year only).
  readonly fromYearName = input<string | null>(null);

  // "Second Term · 2026/2027", for the run button of a same-year rollover.
  readonly toTermName = input('');

  readonly isRunning = input(false);

  // 400 about the password: shown under the password field.
  readonly passwordError = input('');

  // Any other error (429, wrong year name, terms still open...):
  // shown above the buttons.
  readonly formError = input('');

  // After 429: the run button stays disabled for a few minutes.
  readonly isLocked = input(false);

  readonly back = output<void>();
  readonly run = output<RolloverConfirmation>();

  // What the Admin types.
  readonly yearName = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);

  private readonly passwordInput =
    viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  // The password error hides as soon as the Admin types again.
  private readonly typedSinceError = signal(false);

  readonly visiblePasswordError = computed(() =>
    this.typedSinceError() ? '' : this.passwordError()
  );

  // Spaces around the name do not matter (the backend trims it too).
  readonly yearMatches = computed(() =>
    !this.isNewYear() ||
    this.yearName().trim() === (this.fromYearName() ?? '')
  );

  readonly canRun = computed(() =>
    this.yearMatches() &&
    this.password().length > 0 &&
    !this.isRunning() &&
    !this.isLocked()
  );

  readonly tiles = computed<TallyTile[]>(() => {
    const tally = this.tally();

    const tiles: TallyTile[] = this.isNewYear()
      ? [
          { labelKey: 'ROLLOVER.CONFIRM.PROMOTE',  count: tally.promote,  tone: 'green' },
          { labelKey: 'ROLLOVER.CONFIRM.REPEAT',   count: tally.repeat,   tone: 'orange' },
          { labelKey: 'ROLLOVER.CONFIRM.GRADUATE', count: tally.graduate, tone: 'gold' }
        ]
      : [
          { labelKey: 'ROLLOVER.CONFIRM.COPY', count: tally.copy, tone: 'blue' }
        ];

    tiles.push(
      { labelKey: 'ROLLOVER.CONFIRM.ALREADY_PLACED', count: tally.alreadyPlaced, tone: 'grey' },
      { labelKey: 'ROLLOVER.CONFIRM.NO_TARGET',      count: tally.noTarget,      tone: 'dark-red' }
    );

    return tiles;
  });

  constructor() {

    // A wrong password: show the error and put the cursor back
    // in the (empty) field. The parent clears the error before each
    // attempt, so the same message twice is still a new error.
    effect(() => {
      if (this.passwordError()) {
        this.typedSinceError.set(false);
        this.passwordInput()?.nativeElement.focus();
      }
    });
  }

  onYearInput(event: Event): void {
    this.yearName.set((event.target as HTMLInputElement).value);
  }

  onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
    this.typedSinceError.set(true);
  }

  togglePassword(): void {
    this.showPassword.update(show => !show);
  }

  submit(): void {

    if (!this.canRun()) {
      return;
    }

    this.run.emit({
      adminPassword: this.password(),
      confirmYearName: this.isNewYear()
        ? this.yearName().trim()
        : null
    });

    // Cleared after every attempt; the Admin types it again if it fails.
    this.password.set('');
    this.showPassword.set(false);
  }
}
