import { Component, computed, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { MyClassGroup } from '../my-class';


// The colors of one card:
//   main: the header background and the dot of each subject
//   soft: the light background of the "more subjects" line
//   dark: the text on light backgrounds (section badge, "more subjects")
interface CardColor {
  main: string;
  soft: string;
  dark: string;
}


// Card colors (no navy). The page gives each card an index,
// and the card takes the color at that index (it cycles after the last one).
const CARD_COLORS: CardColor[] = [
  { main: '#1D9E75', soft: '#E1F5EE', dark: '#085041' }, // teal
  { main: '#D85A30', soft: '#FAECE7', dark: '#712B13' }, // coral
  { main: '#7F77DD', soft: '#EEEDFE', dark: '#3C3489' }, // purple
  { main: '#D4537E', soft: '#FBEAF0', dark: '#72243E' }, // pink
  { main: '#BA7517', soft: '#FAEEDA', dark: '#633806' }, // amber
  { main: '#378ADD', soft: '#E6F1FB', dark: '#0C447C' }, // sky blue
];


// How many subject lines a card shows.
// All cards have the same height, so the rest are counted in the "more subjects" line.
const MAX_VISIBLE_SUBJECTS = 3;


// One card of "My classes": a class + a section,
// with one line per subject the teacher teaches there.
// Display only: the page builds the group and passes it in.
//
// The arrow at the end of each line has no action yet.
// Later each line opens the assignment (assessments and grade sheet),
// using line.assignment.teacherAssignmentId.
@Component({
  selector: 'app-my-class-card',
  imports: [
    MatIconModule,
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
    () => CARD_COLORS[this.colorIndex() % CARD_COLORS.length]
  );

  readonly visibleSubjects = computed(
    () => this.group().subjects.slice(0, MAX_VISIBLE_SUBJECTS)
  );

  readonly hiddenSubjectsCount = computed(
    () => Math.max(this.group().subjects.length - MAX_VISIBLE_SUBJECTS, 0)
  );
}