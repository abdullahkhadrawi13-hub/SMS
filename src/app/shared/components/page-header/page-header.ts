import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

// The shared page header: title, one line under it, and the page buttons.
// Spec: "SMS — مواصفات تصميم الكحلي والذهبي" → الإطار العام → الصفحة.
//
// Usage:
//   <app-page-header
//     [title]="'STUDENTS.TITLE' | translate"
//     [subtitle]="'PAGE.SUBTITLE' | translate"
//   >
//     <span badge>…</span>       optional, next to the title
//     <span subtitle>…</span>    optional, richer line under the title
//     <div leading>…</div>       optional, icon before the title
//     <button actions …>…</button>  optional, buttons or chips at the end
//   </app-page-header>
//
// Title and subtitle arrive already translated, so a title with a value
// inside it ('SUBJECTS.PLAN_DETAILS.TITLE' with { subject }) works the same.
@Component({
  selector: 'app-page-header',
  imports: [
    RouterLink,
    MatIconModule,
  ],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader {

  // The page name (h1). Not a welcome sentence.
  readonly title = input.required<string>();

  // One useful line under the title (a count, a date, what the page is for).
  readonly subtitle = input('');

  // Optional "back" link above the title (the Settings sub-pages).
  // Shown only when backLink is set.
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('');
  readonly backQueryParams = input<Record<string, string> | null>(null);
}
