import { Component, computed, input, output, signal } from '@angular/core';

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


// One filter chip: a suggestion and how many students have it.
interface FilterChip {
  suggestion: RolloverSuggestion;
  count: number;
}


// Step 1: what the backend suggests for every student, grouped by class.
// The filter chips are a view setting of this step only.
@Component({
  selector: 'app-rollover-preview',
  imports: [
    MatIconModule,
    TranslatePipe,

    RolloverClassGroup
  ],
  templateUrl: './rollover-preview.html',
  styleUrl: './rollover-preview.css',
})
export class RolloverPreview {

  readonly preview = input.required<RolloverPreviewData>();
  readonly groups = input<ClassGroupView[]>([]);
  readonly decisions = input<RolloverDecisions>({});

  readonly decisionChange = output<RolloverDecisionChange>();

  readonly suggestionStyle = SUGGESTION_STYLE;

  // The chosen chip (null = all students).
  private readonly selected = signal<RolloverSuggestion | null>(null);

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
    this.selected.set(suggestion);
  }
}
