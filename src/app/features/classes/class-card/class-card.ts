import { Component, computed, inject, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClass } from '../../../core/models/school-class';
import { Language } from '../../../core/services/language';
import {
  CardColor,
  getCardColor
} from '../../../shared/constants/card-colors';


// One card of the classes page: a fully colored card with
// the class name (in the current language), its level,
// its status and the graduation badge.
//
// Display only: the grid passes the class in,
// and the actions (edit / activate / deactivate) go up as outputs.
@Component({
  selector: 'app-class-card',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
  ],
  templateUrl: './class-card.html',
  styleUrl: './class-card.css',
})
export class ClassCard {

  // Used to show the class name in the current language.
  private readonly language = inject(Language);


  // ===== Inputs =====

  readonly schoolClass = input.required<SchoolClass>();

  // The position of the card in the grid (chooses its color).
  readonly colorIndex = input(0);

  // Shows the actions menu (Admin only).
  readonly canManage = input(false);

  // True while a class status is being changed
  // (disables activate / deactivate to prevent repeated clicks).
  readonly isToggling = input(false);


  // ===== Outputs =====

  readonly edit = output<void>();
  readonly toggleStatus = output<void>();


  // ===== Computed =====

  readonly color = computed<CardColor>(
    () => getCardColor(this.colorIndex())
  );

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  // Class name according to the current language.
  readonly className = computed(() =>
    this.isArabic()
      ? this.schoolClass().classNameAr
      : this.schoolClass().classNameEn
  );
}
