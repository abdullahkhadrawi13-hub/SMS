import { Component, input } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../shared/components/page-header/page-header';


// The title of the grades page.
// The subtitle depends on the role (chosen by the parent page).
@Component({
  selector: 'app-grades-header',
  imports: [
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './grades-header.html',
  styleUrl: './grades-header.css',
})
export class GradesHeader {

  // Translation key of the subtitle.
  readonly subtitleKey = input.required<string>();
}
