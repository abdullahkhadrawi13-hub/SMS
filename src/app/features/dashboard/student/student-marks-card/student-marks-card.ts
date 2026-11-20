import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { DashboardLatestMark } from '../../../../core/models/dashboard';
import { LatestMarks } from '../../shared/latest-marks/latest-marks';


// "آخر علاماتي" on the Student dashboard: the newest 5 marks of the current
// term, and a link to the full grades page (/grades → «علاماتي»).
@Component({
  selector: 'app-student-marks-card',
  imports: [TranslatePipe, RouterLink, LatestMarks],
  templateUrl: './student-marks-card.html',
  styleUrl: './student-marks-card.css',
})
export class StudentMarksCard {
  readonly marks = input.required<DashboardLatestMark[]>();
}
