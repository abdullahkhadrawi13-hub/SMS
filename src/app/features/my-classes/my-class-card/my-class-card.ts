import { Component, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { MyClassGroup } from '../my-class';


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
}
