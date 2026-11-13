import { Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { pluralKey } from '../../../shared/utils/plural';
import { formatNumber } from '../../subjects/shared/subjects-shared';

import { MyClassGroup, MyClassSubject } from '../my-class';
import { MY_PLAN_BADGE, MyPlanBadge, myPlanStatus } from '../my-classes-shared';


// One subject line, with the badge of its plan state.
interface SubjectLine {
  subject: MyClassSubject;
  badge: MyPlanBadge;
}


// One card of "My classes": a class + a section,
// with one line per subject the teacher teaches there (all of them).
// Display only: the page builds the group and passes it in.
//
// Each subject line is a link to the assessments of that subject
// (/my-classes/:teacherAssignmentId/assessments).
@Component({
  selector: 'app-my-class-card',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    MatIconModule,
    TranslatePipe,
    StatusBadge,
  ],
  templateUrl: './my-class-card.html',
  styleUrl: './my-class-card.css',
})
export class MyClassCard {

  readonly group = input.required<MyClassGroup>();

  readonly formatNumber = formatNumber;


  readonly lines = computed<SubjectLine[]>(() =>
    this.group().subjects.map(subject => ({
      subject,
      badge: MY_PLAN_BADGE[myPlanStatus(subject.plan)],
    }))
  );

  // "مادتان", "4 مواد" (see shared/utils/plural).
  readonly subjectsCountKey = computed(
    () => pluralKey('MY_CLASSES.CARD.SUBJECTS', this.group().subjects.length)
  );
}
