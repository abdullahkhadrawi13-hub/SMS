import { Component, output } from '@angular/core';

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

  readonly addClass = output<void>();

  onAddClass(): void {
    this.addClass.emit();
  }
}