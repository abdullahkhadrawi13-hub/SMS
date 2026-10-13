import { Component, computed, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { MyClassesStats as MyClassesStatsData } from '../my-class';


// The three numbers above the cards of "My classes".
// Display only: the page computes the numbers and passes them in.
@Component({
  selector: 'app-my-classes-stats',
  imports: [
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './my-classes-stats.html',
  styleUrl: './my-classes-stats.css',
})
export class MyClassesStats {

  readonly stats = input.required<MyClassesStatsData>();

  // Share of assessment structures that are locked (0 to 100).
  readonly lockedProgress = computed(() => {

    const { lockedCount, totalAssignments } = this.stats();

    return totalAssignments === 0
      ? 0
      : Math.round((lockedCount / totalAssignments) * 100);
  });
}
