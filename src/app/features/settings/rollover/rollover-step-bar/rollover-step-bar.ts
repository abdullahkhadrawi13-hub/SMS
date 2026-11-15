import { Component, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';


// The colour of the note: muted (a plain fact), warn (something blocks
// "Next"), ok (everything is ready).
export type StepBarTone = 'muted' | 'warn' | 'ok';


// The bar at the bottom of every rollover step (navy & gold, 15 Nov 2026):
// a note at the start, the step's buttons at the end. It sticks to the
// bottom of the screen, so "Next" is always in reach, even under a long
// list of classes. White with a border and a shadow, because it floats
// above the content (the unsaved-changes bar is the warm yellow one).
//
// Put it as the last child of the block that holds the step:
//
//   <app-rollover-step-bar icon="error" tone="warn">
//     <span note>1 student needs a decision…</span>
//     <ng-container ngProjectAs="[actions]">
//       <button mat-stroked-button>Back</button>
//       <button mat-flat-button>Next</button>
//     </ng-container>
//   </app-rollover-step-bar>
@Component({
  selector: 'app-rollover-step-bar',
  imports: [MatIconModule],
  templateUrl: './rollover-step-bar.html',
  styleUrl: './rollover-step-bar.css',
})
export class RolloverStepBar {

  // A Material Symbol before the note (null = no icon).
  readonly icon = input<string | null>(null);

  readonly tone = input<StepBarTone>('muted');
}
