import { Component, input, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import {
  getRelationshipTranslationKey,
  PARENT_RELATIONSHIPS,
  ParentRelationship
} from '../../../core/models/parent';
import {
  isRelationshipTaken,
  NO_TAKEN_RELATIONSHIPS,
  TakenRelationships
} from '../parents';


// The relationship buttons (father / mother / guardian) of one child.
// Used by the add form (one per child row) and the "Link a child" dialog.
//
// A father or mother the student already has is disabled, with the
// name of that parent under the buttons, so the backend error
// ("already has a father") does not happen at all.
//
// Navy & gold (11 Nov 2026): three real radio buttons drawn as one
// segmented control (no mat-button-toggle). The chosen one takes the
// colour of its relationship, the same as the shared chip.
@Component({
  selector: 'app-relationship-toggle',
  imports: [
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './relationship-toggle.html',
  styleUrl: './relationship-toggle.css',
  host: {
    '[class.is-large]': 'large()'
  }
})
export class RelationshipToggle {

  // The chosen relationship (null = not chosen yet).
  readonly value = input<ParentRelationship | null>(null);

  // The father / mother the student already has.
  readonly taken = input<TakenRelationships>(NO_TAKEN_RELATIONSHIPS);

  // Disables every button (while checking the student, or while saving).
  readonly disabled = input(false);

  // Shows "Choose the relationship" in red (after a save attempt).
  readonly showRequiredError = input(false);

  // Bigger buttons (the link dialog).
  readonly large = input(false);

  readonly valueChange = output<ParentRelationship>();


  // Radio buttons with the same name are one group, so every toggle
  // on the screen needs its own name (one per child row in the add form).
  private static nextId = 0;

  readonly groupName = `relationship-${RelationshipToggle.nextId++}`;


  readonly relationships = PARENT_RELATIONSHIPS;
  readonly getRelationshipTranslationKey = getRelationshipTranslationKey;


  isTaken(relationship: ParentRelationship): boolean {
    return isRelationshipTaken(this.taken(), relationship);
  }
}
