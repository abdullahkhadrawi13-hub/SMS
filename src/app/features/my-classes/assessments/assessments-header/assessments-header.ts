import { Component, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';


// The badge of the plan state (icon + translation key + CSS class),
// the same badge the Admin sees in the subject plan page.
export interface PlanStatusBadge {
  icon: string;
  labelKey: string;
  cssClass: string;
}


// The header of the assessments page: the subject, its class and section,
// the term, and the plan's passing mark and state.
// Display only: the page passes every value in the current language.
@Component({
  selector: 'app-assessments-header',
  imports: [
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './assessments-header.html',
  styleUrl: './assessments-header.css',
})
export class AssessmentsHeader {

  readonly subjectName = input.required<string>();
  readonly className = input.required<string>();
  readonly sectionName = input.required<string>();
  readonly termName = input('');

  // null while there is no plan.
  readonly passingMark = input<string | null>(null);
  readonly planBadge = input<PlanStatusBadge | null>(null);
}
