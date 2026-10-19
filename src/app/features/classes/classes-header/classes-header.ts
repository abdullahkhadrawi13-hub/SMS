import { Component } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

// Page title and description.
// Adding a class is done from the "Add academic class" card in the grid.
@Component({
  selector: 'app-classes-header',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './classes-header.html',
  styleUrl: './classes-header.css',
})
export class ClassesHeader {}
