import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';


// One number of the strip. The page builds the items (in a small function
// next to the page), so the strip only shows them.
export interface NumbersStripItem {
  // The label above the number (a translation key).
  labelKey: string;

  value: number;

  // Shown instead of value, already formatted ("93%", "—").
  valueText?: string;

  // No value yet ("—" before any recorded day): shown light, not bold.
  isEmpty?: boolean;

  // The value in red (days absent, failed subjects).
  isBad?: boolean;

  // The bigger number that answers the page's question (28px; 24px on the phone).
  lead?: boolean;

  // A small text right after the number ("من الأيام المسجَّلة").
  hintKey?: string;

  // The line under the number: a translation key with its params
  // (a count goes through pluralKey before it gets here), or a text
  // already in the UI language (a list of subject names).
  captionKey?: string;
  captionParams?: Record<string, string | number>;
  captionText?: string;

  // A gold bar under the number (0–100), in place of the caption line.
  bar?: number;
}


// The numbers strip of the whole app: a few numbers in one card split by
// 1px lines, no icons (spec: الأرقام المجمّعة).
//
// Used by:
//   - the Admin and AssistantPrincipal dashboards (admin-numbers.ts)
//   - the Teacher dashboard
//   - the Student dashboard and each child's card on the Parent dashboard
//     (attendance-numbers.ts)
//   - «حضوري», «حضور أبنائي» and the "Attendance" tab of the student page
//     (term-attendance)
//
// Four numbers: one row on the computer, 2 × 2 on the phone.
// Three numbers stay in one row on the phone too.
//
// embedded: no border of its own, smaller numbers (20px), a line above it:
// the strip inside a child's card on the Parent dashboard.
@Component({
  selector: 'app-numbers-strip',
  imports: [TranslatePipe],
  templateUrl: './numbers-strip.html',
  styleUrl: './numbers-strip.css',
  host: {
    '[class.embedded]': 'embedded()',
    '[class.three]': 'items().length === 3',
  },
})
export class NumbersStrip {

  readonly items = input.required<NumbersStripItem[]>();

  // Translation key of the strip's accessible name.
  readonly ariaKey = input.required<string>();

  readonly embedded = input(false);
}
