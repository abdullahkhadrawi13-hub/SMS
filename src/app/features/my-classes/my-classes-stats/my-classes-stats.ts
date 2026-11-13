import { Component, computed, input } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { pluralKey } from '../../../shared/utils/plural';

import { MyClassesStats as MyClassesStatsData } from '../my-class';


// The three numbers above the cards of "My classes":
// sections, subjects, and locked plans (with a gold progress bar).
// Display only: the page computes the numbers and passes them in.
@Component({
  selector: 'app-my-classes-stats',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './my-classes-stats.html',
  styleUrl: './my-classes-stats.css',
})
export class MyClassesStats {

  readonly stats = input.required<MyClassesStatsData>();

  // Counted words ("في صفّين", "8 إسنادات"): see shared/utils/plural.
  readonly countKey = pluralKey;

  // Share of subjects whose plan is locked (0 to 100).
  readonly lockedProgress = computed(() => {

    const { lockedCount, totalAssignments } = this.stats();

    return totalAssignments === 0
      ? 0
      : Math.round((lockedCount / totalAssignments) * 100);
  });
}
