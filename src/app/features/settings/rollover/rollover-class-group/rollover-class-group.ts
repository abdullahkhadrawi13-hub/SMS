import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import {
  RolloverStudent,
  RolloverSuggestion
} from '../../../../core/models/rollover';
import { Language } from '../../../../core/services/language';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { pluralKey } from '../../../../shared/utils/plural';

import {
  avatarTone,
  differsFromSuggestion,
  graduatesIfPromoted,
  ClassGroupView,
  isDecidable,
  nameInitials,
  RolloverDecision,
  RolloverDecisions,
  SUGGESTION_STYLE,
  SuggestionStyle
} from '../rollover';


// A decision changed by the Admin.
export interface RolloverDecisionChange {
  studentId: number;
  decision: RolloverDecision;
}

// What the "To" column shows for one student.
// place   : a class and a section (moved = a new class, repeats = stays back)
// graduate: graduates (graduation class, promoted)
// pending : waits for the Admin's decision
// none    : cannot be placed (note = the reason from the backend)
interface Destination {
  kind: 'place' | 'graduate' | 'pending' | 'none';
  className?: string;
  sectionName?: string;
  moved?: boolean;
  repeats?: boolean;
  note?: string;
}

// The counts in the panel header, one per suggestion.
interface HeaderCount {
  suggestion: RolloverSuggestion;
  count: number;
}


// One class of the source term (navy & gold, 15 Nov 2026): a card that
// opens and closes like the year cards, with "Seventh → Eighth", the counts
// per suggestion and the students still waiting for a decision.
// Inside: the shared table look (.data-card, .data-table in styles.css),
// or a two-line list on the phone. The decision is the shared
// .choice-switch (two real radio buttons). A decision that differs from
// the suggestion marks the row, like a changed student in attendance.
@Component({
  selector: 'app-rollover-class-group',
  imports: [
    NgTemplateOutlet,
    MatIconModule,
    TranslatePipe,
    StatusBadge
  ],
  templateUrl: './rollover-class-group.html',
  styleUrl: './rollover-class-group.css',
  host: {
    // A class with no student under the filter takes no space.
    '[class.is-empty]': 'rows().length === 0',
  },
})
export class RolloverClassGroup {

  private readonly language = inject(Language);

  readonly group = input.required<ClassGroupView>();
  readonly decisions = input<RolloverDecisions>({});

  // The decision toggles appear in a new-year rollover only.
  readonly isNewYear = input(false);

  // The suggestion chosen in the filters (null = all students).
  readonly filter = input<RolloverSuggestion | null>(null);

  // Under 720px: a two-line list instead of the table.
  readonly isPhone = input(false);

  readonly decisionChange = output<RolloverDecisionChange>();

  // Panels start open; the Admin can fold the ones already checked.
  readonly isOpen = signal(true);

  readonly suggestionStyle = SUGGESTION_STYLE;

  // The enum, so the template can compare with names instead of numbers.
  readonly Suggestion = RolloverSuggestion;

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // The rows shown under the current filter.
  readonly rows = computed(() => {
    const filter = this.filter();

    return this.group().students.filter(student =>
      filter === null || student.suggestion === filter
    );
  });

  readonly className = computed(() =>
    this.pick(this.group().classNameAr, this.group().classNameEn)
  );

  readonly targetName = computed(() => {
    const group = this.group();

    return group.targetClassNameAr === null
      ? ''
      : this.pick(group.targetClassNameAr, group.targetClassNameEn ?? '');
  });

  readonly headerCounts = computed<HeaderCount[]>(() => {
    const counts = new Map<RolloverSuggestion, number>();

    for (const student of this.group().students) {
      counts.set(student.suggestion, (counts.get(student.suggestion) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([suggestion, count]) => ({ suggestion, count }));
  });


  // NeedsDecision students the Admin has not decided yet (shown in the
  // header even when the card is closed).
  readonly pendingCount = computed(() =>
    this.isNewYear()
      ? this.group().students.filter(student =>
          isDecidable(student) && this.decisionOf(student) === null
        ).length
      : 0
  );

  readonly pendingKey = computed(() =>
    pluralKey('ROLLOVER.PREVIEW.CLASS_PENDING', this.pendingCount())
  );

  // Ids for aria-controls and the radio names (one card per class).
  readonly bodyId = computed(() => `rollover-class-${this.group().classId}`);


  toggle(): void {
    this.isOpen.update(open => !open);
  }

  canDecide(student: RolloverStudent): boolean {
    return this.isNewYear() && isDecidable(student);
  }

  decisionOf(student: RolloverStudent): RolloverDecision | null {
    return this.decisions()[student.studentId] ?? null;
  }

  // The student graduates if promoted (a graduation class).
  graduates(student: RolloverStudent): boolean {
    return graduatesIfPromoted(student);
  }

  // "Graduate" instead of "Promote" in a graduation class.
  promoteLabel(student: RolloverStudent): string {
    return graduatesIfPromoted(student)
      ? 'ROLLOVER.DECISION.GRADUATE'
      : 'ROLLOVER.DECISION.PROMOTE';
  }

  // The Admin chose the other decision than the suggestion.
  isChanged(student: RolloverStudent): boolean {
    return this.canDecide(student)
      && differsFromSuggestion(student, this.decisionOf(student));
  }

  styleOf(student: RolloverStudent): SuggestionStyle {
    return SUGGESTION_STYLE[student.suggestion];
  }

  avatarTone(student: RolloverStudent): number {
    return avatarTone(student.studentId);
  }

  initials(student: RolloverStudent): string {
    return nameInitials(this.studentName(student));
  }

  onDecision(student: RolloverStudent, decision: RolloverDecision): void {
    this.decisionChange.emit({ studentId: student.studentId, decision });
  }

  studentName(student: RolloverStudent): string {
    return this.pick(student.studentNameAr, student.studentNameEn);
  }

  fromClass(student: RolloverStudent): string {
    return this.pick(student.fromClassNameAr, student.fromClassNameEn);
  }

  fromSection(student: RolloverStudent): string {
    return this.pick(student.fromSectionAr, student.fromSectionEn);
  }

  subjectName(subject: { subjectAr: string; subjectEn: string }): string {
    return this.pick(subject.subjectAr, subject.subjectEn);
  }

  note(student: RolloverStudent): string {
    return this.pick(student.noteAr, student.noteEn);
  }

  // Where the student will be after the rollover, with the Admin's decision.
  destination(student: RolloverStudent): Destination {

    const target = (moved: boolean): Destination => ({
      kind: 'place',
      className: this.pick(student.targetClassNameAr ?? '', student.targetClassNameEn ?? ''),
      sectionName: this.pick(student.targetSectionAr ?? '', student.targetSectionEn ?? ''),
      moved,
      repeats: false
    });

    const stays = (repeats: boolean): Destination => ({
      kind: 'place',
      className: this.fromClass(student),
      sectionName: this.fromSection(student),
      moved: false,
      repeats
    });

    switch (student.suggestion) {

      case RolloverSuggestion.NoTarget:
        return { kind: 'none', note: this.note(student) };

      // The real placement in the current term.
      case RolloverSuggestion.AlreadyPlaced:
        return student.targetClassId !== null ? target(false) : stays(false);

      // Same year: same class and same section.
      case RolloverSuggestion.Copy:
        return student.targetClassId !== null ? target(false) : stays(false);
    }

    const decision = this.decisionOf(student);

    if (decision === null) {
      return { kind: 'pending' };
    }

    if (decision === 'repeat') {
      return stays(true);
    }

    return graduatesIfPromoted(student)
      ? { kind: 'graduate' }
      : target(true);
  }

  private pick(ar: string, en: string): string {
    return this.isArabic() ? ar || en : en || ar;
  }
}
