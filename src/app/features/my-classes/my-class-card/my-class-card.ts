import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { pluralKey } from '../../../shared/utils/plural';

import { MyClassGroup, MyClassSubject, MyPlanStatus } from '../my-class';
import { MY_PLAN_BADGE, myPlanStatus } from '../my-classes-shared';


// One subject button, with the state of its plan.
interface SubjectChip {
  subject: MyClassSubject;
  status: MyPlanStatus;

  // The small icon at the start of the button (null = no plan: no icon).
  icon: string | null;

  // The state in words (the link's accessible name and its tooltip):
  // the same words as the Admin's plan badge.
  statusKey: string;
}


// One card of "My classes": a class + a section, with one small button
// per subject the teacher teaches there (all of them, side by side).
// Display only: the page builds the group and passes it in.
//
// Each button is a link to the assessments of that subject
// (/my-classes/:teacherAssignmentId/assessments). The passing mark is not
// on the card: it can differ between subjects, and the assessments page shows it.
@Component({
  selector: 'app-my-class-card',
  imports: [
    RouterLink,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './my-class-card.html',
  styleUrl: './my-class-card.css',
})
export class MyClassCard {

  readonly group = input.required<MyClassGroup>();


  readonly chips = computed<SubjectChip[]>(() =>
    this.group().subjects.map(subject => {

      const status = myPlanStatus(subject.plan);
      const badge = MY_PLAN_BADGE[status];

      return {
        subject,
        status,
        icon: badge.icon,
        statusKey: badge.labelKey,
      };
    })
  );

  // "مادتان", "4 مواد" (see shared/utils/plural).
  readonly subjectsCountKey = computed(
    () => pluralKey('MY_CLASSES.CARD.SUBJECTS', this.group().subjects.length)
  );
}
