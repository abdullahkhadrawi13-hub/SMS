import { Component, computed, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { CardColor, getCardColor } from '../../../shared/constants/card-colors';

import { MyClassGroup } from '../my-class';


// How many subject lines a card shows.
// All cards have the same height, so the rest are counted in the "more subjects" line.
const MAX_VISIBLE_SUBJECTS = 3;


// One card of "My classes": a class + a section,
// with one line per subject the teacher teaches there.
// Display only: the page builds the group and passes it in.
//
// Each subject line is a link to the assessments of that subject
// (/my-classes/:teacherAssignmentId/assessments).
@Component({
  selector: 'app-my-class-card',
  imports: [
    MatIconModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './my-class-card.html',
  styleUrl: './my-class-card.css',
})
export class MyClassCard {

  readonly group = input.required<MyClassGroup>();

  // The position of the card in the page (chooses its color).
  readonly colorIndex = input(0);


  readonly color = computed<CardColor>(
    () => getCardColor(this.colorIndex())
  );

  readonly visibleSubjects = computed(
    () => this.group().subjects.slice(0, MAX_VISIBLE_SUBJECTS)
  );

  readonly hiddenSubjectsCount = computed(
    () => Math.max(this.group().subjects.length - MAX_VISIBLE_SUBJECTS, 0)
  );
}