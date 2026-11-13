import { Component, input } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

import { MyPlanBadge } from '../../my-classes-shared';


// The header of the assessments page: the "My classes" back link, the subject,
// the plan state badge (the same badge the Admin sees), and class · section · term.
// The passing mark is in the plan card under the header.
// Display only: the page passes every value in the current language.
@Component({
  selector: 'app-assessments-header',
  imports: [
    TranslatePipe,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: './assessments-header.html',
  styleUrl: './assessments-header.css',
})
export class AssessmentsHeader {

  // Empty while the assignment is loading (the title is then "Assessments").
  readonly subjectName = input('');
  readonly className = input('');
  readonly sectionName = input('');
  readonly termName = input('');

  // null while loading, or when the page cannot show the plan.
  readonly planBadge = input<MyPlanBadge | null>(null);
}
