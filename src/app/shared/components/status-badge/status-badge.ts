import { Component, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';


// The colour of a badge, from the spec's "ألوان المعنى" table.
// Each colour has one meaning across the whole system.
// (A graduated student has its own outlined look: see app-student-status.)
//
//   ok       green   active account, present, complete, grades open
//   bad      red     absent
//   warn     yellow  partial, incomplete
//   neutral  grey    inactive, not started, closed, past
//   gold     gold    the graduation class (light gold, dark gold text)
export type StatusBadgeTone = 'ok' | 'bad' | 'warn' | 'neutral' | 'gold';


// The shared filled badge (spec: "الشارات").
// Used for the account status (isActive) and every other status badge.
// The student's status (studentStatus) has its own look: app-student-status.
//
// Usage:
//   <app-status-badge [tone]="student.isActive ? 'ok' : 'neutral'">
//     {{ (student.isActive ? 'SHARED.ACCOUNT.ACTIVE' : 'SHARED.ACCOUNT.INACTIVE') | translate }}
//   </app-status-badge>
//
//   <app-status-badge tone="bad" icon="person_off">…</app-status-badge>
//
// - tone: the colour (see StatusBadgeTone). Default 'neutral'.
// - icon: optional Material Symbol, shown instead of the dot.
// - outlined: white with a coloured border, for the quieter of two states
//   of the same kind (an active term next to the green "current term";
//   added 15 Nov 2026). Only the 'ok' tone has an outlined look.
// - The text is the content, already translated.
//
// Colours: src/tokens.css only (--ok-bg, --ok-ink, ...).
@Component({
  selector: 'app-status-badge',
  imports: [MatIconModule],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
  host: {
    '[attr.data-tone]': 'tone()',
    '[attr.data-outlined]': 'outlined() ? "" : null',
  },
})
export class StatusBadge {
  readonly tone = input<StatusBadgeTone>('neutral');
  readonly icon = input<string | null>(null);
  readonly outlined = input(false);
}
