import { Component, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-classes-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './classes-header.html',
  styleUrl: './classes-header.css',
})
export class ClassesHeader {

  // Shows the "Add class" button only for users allowed to add classes.
  readonly canManage = input(false);

  readonly addClass = output<void>();

  onAddClass(): void {
    this.addClass.emit();
  }
}