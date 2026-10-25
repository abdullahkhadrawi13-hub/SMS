import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../../core/services/language';
import { Assessment } from '../../../../core/models/assessment';

import { formatNumber } from '../../../subjects/shared/subjects-shared';
import { ComponentGroup } from '../assessments';


// One component of the subject plan, with the section's assessments under it.
//   - open component: the teacher's own assessments (quizzes), with
//     "Add assessment", and edit / delete on each one.
//   - fixed component: its one assessment, created by the system from the plan.
//     Read-only for the teacher (the Admin manages it in the subject plan).
// Display only: the page opens the dialogs and sends the requests.
@Component({
  selector: 'app-plan-component-card',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './plan-component-card.html',
  styleUrl: './plan-component-card.css',
})
export class PlanComponentCard {

  private readonly language = inject(Language);

  readonly group = input.required<ComponentGroup>();

  // The assessment being deleted (its buttons are disabled meanwhile).
  readonly busyAssessmentId = input<number | null>(null);

  readonly addAssessment = output<void>();
  readonly editAssessment = output<Assessment>();
  readonly deleteAssessment = output<Assessment>();


  readonly isOpen = computed(
    () => this.group().component.teacherAddsAssessments
  );

  readonly weight = computed(
    () => formatNumber(this.group().component.weight)
  );

  readonly fixedMaxMark = computed(
    () => formatNumber(this.group().component.maxMark)
  );

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  assessmentName(assessment: Assessment): string {
    return this.isArabic() ? assessment.nameAr : assessment.nameEn;
  }

  maxMark(assessment: Assessment): string {
    return formatNumber(assessment.maxMark);
  }
}
