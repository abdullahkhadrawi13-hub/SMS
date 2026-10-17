import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { SubjectPlan } from '../../../../core/models/subject-plan';

import {
  componentColor,
  formatNumber,
  FULL_WEIGHT,
  getPlanStatus,
  PLAN_STATUS_BADGE,
  sortComponents,
} from '../../subject';
import { PlanWeightBar } from '../plan-weight-bar/plan-weight-bar';


// One card of the plans tab: one subject's plan for the selected class.
// Shows the state, the passing mark, the weights bar, the components
// and how many sections follow the plan. "Open" goes to the plan details page.
// Display only.
@Component({
  selector: 'app-plan-card',
  imports: [
    MatButtonModule,
    MatIconModule,
    PlanWeightBar,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './plan-card.html',
  styleUrl: './plan-card.css',
})
export class PlanCard {

  private readonly language = inject(Language);

  readonly plan = input.required<SubjectPlan>();

  // Shows the "Assign a teacher" link when no section follows the plan (Admin).
  readonly canManage = input(false);

  // "Assign a teacher": the page opens the assignments tab.
  readonly assignTeacher = output<void>();


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly formatNumber = formatNumber;

  readonly subjectName = computed(() =>
    this.isArabic() ? this.plan().subjectAr : this.plan().subjectEn
  );

  readonly badge = computed(
    () => PLAN_STATUS_BADGE[getPlanStatus(this.plan())]
  );

  readonly components = computed(() =>
    sortComponents(this.plan().components).map((component, index) => ({
      component,
      name: this.isArabic() ? component.nameAr : component.nameEn,
      color: componentColor(index),
    }))
  );

  readonly weights = computed(
    () => this.components().map(c => c.component.weight)
  );

  // What is left to reach 100 (shown on an incomplete plan).
  readonly remainingWeight = computed(
    () => formatNumber(FULL_WEIGHT - this.plan().totalWeight)
  );
}
