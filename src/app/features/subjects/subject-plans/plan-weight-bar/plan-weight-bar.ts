import { Component, computed, input } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { componentColor, formatNumber, FULL_WEIGHT } from '../../shared/subjects-shared';


// The weights of a plan as one bar: one colored part per component
// (in the components' order), and "Total weights 80 / 100" above it.
// Used by the plan card, the plan details page and the plan form.
// Display only.
@Component({
  selector: 'app-plan-weight-bar',
  imports: [TranslatePipe],
  templateUrl: './plan-weight-bar.html',
  styleUrl: './plan-weight-bar.css',
})
export class PlanWeightBar {

  // The weight of each component, in their order.
  readonly weights = input<number[]>([]);

  readonly fullWeight = FULL_WEIGHT;

  readonly total = computed(
    () => this.weights().reduce((sum, w) => sum + (Number(w) || 0), 0)
  );

  readonly totalLabel = computed(() => formatNumber(this.total()));

  // complete = exactly 100, over = more than 100 (only while typing in a form).
  readonly state = computed(() => {

    const total = Math.round(this.total() * 100) / 100;

    if (total === FULL_WEIGHT) {
      return 'complete';
    }

    return total > FULL_WEIGHT ? 'over' : 'under';
  });

  // One part per component, with its width (out of 100) and color.
  readonly parts = computed(() => this.weights().map((weight, index) => ({
    width: Math.max(Number(weight) || 0, 0),
    color: componentColor(index),
  })));
}
