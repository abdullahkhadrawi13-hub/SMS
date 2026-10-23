import { Component, input, output } from '@angular/core';

import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
@Component({
  selector: 'app-relationship-toggle',
  imports: [
    MatButtonToggleModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './relationship-toggle.html',
  styleUrl: './relationship-toggle.css',
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


  readonly relationships = PARENT_RELATIONSHIPS;
  readonly getRelationshipTranslationKey = getRelationshipTranslationKey;


  isTaken(relationship: ParentRelationship): boolean {
    return isRelationshipTaken(this.taken(), relationship);
  }
}
