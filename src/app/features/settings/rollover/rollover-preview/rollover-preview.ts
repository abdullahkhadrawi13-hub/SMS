import { Component, computed, input, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import {
  RolloverPreview as RolloverPreviewData,
  RolloverSuggestion
} from '../../../../core/models/rollover';

import {
  ClassGroupView,
  NEW_YEAR_SUGGESTIONS,
  RolloverDecisions,
  SAME_YEAR_SUGGESTIONS,
  SUGGESTION_STYLE
} from '../rollover';
import {
  RolloverClassGroup,
  RolloverDecisionChange
} from '../rollover-class-group/rollover-class-group';
import { StateCard } from '../../../../shared/components/state-card/state-card';


// One filter chip: a suggestion and how many students have it.
interface FilterChip {
  suggestion: RolloverSuggestion;
  count: number;
}


// Step 1: what the backend suggests for every student, grouped by class
// (navy & gold, 15 Nov 2026): the filters on the page background, then
// one card per class. The chosen filter lives in the page, so the step
// bar's "Show" link can choose "Needs a decision".
@Component({
  selector: 'app-rollover-preview',
  imports: [
    MatIconModule,
    TranslatePipe,

    RolloverClassGroup,
    StateCard
  ],
  templateUrl: './rollover-preview.html',
  styleUrl: './rollover-preview.css',
})
export class RolloverPreview {

  readonly preview = input.required<RolloverPreviewData>();
  readonly groups = input<ClassGroupView[]>([]);
  readonly decisions = input<RolloverDecisions>({});

  // The chosen filter (null = all students), kept by the page.
  readonly selected = input<RolloverSuggestion | null>(null);

  // Under 720px the classes show their students as a two-line list.
  readonly isPhone = input(false);

  readonly decisionChange = output<RolloverDecisionChange>();
  readonly filterChange = output<RolloverSuggestion | null>();

  readonly suggestionStyle = SUGGESTION_STYLE;

  readonly chips = computed<FilterChip[]>(() => {
    const preview = this.preview();

    const order = preview.isNewYear
      ? NEW_YEAR_SUGGESTIONS
      : SAME_YEAR_SUGGESTIONS;

    return order.map(suggestion => ({
      suggestion,
      count: preview.students.filter(student => student.suggestion === suggestion).length
    }));
  });

  // A chip whose count became 0 (another preview) falls back to "All".
  readonly filter = computed(() => {
    const selected = this.selected();

    const chip = this.chips().find(item => item.suggestion === selected);

    return chip && chip.count > 0 ? selected : null;
  });

  readonly total = computed(() => this.preview().students.length);

  select(suggestion: RolloverSuggestion | null): void {
    this.filterChange.emit(suggestion);
  }
}
