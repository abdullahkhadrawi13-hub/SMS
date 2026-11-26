import { Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatMenuTrigger } from '@angular/material/menu';

import { DialogHistory } from '../../core/services/dialog-history';


// The browser's Back button closes an open ⋮ menu, and the page stays
// (core/services/dialog-history.ts).
//
// It works on every [matMenuTriggerFor] button of a component that has
// MenuBackClose in its imports: nothing to add to the button itself.
@Directive({
  selector: '[matMenuTriggerFor]'
})
export class MenuBackClose {

  constructor() {

    const trigger = inject(MatMenuTrigger);
    const dialogHistory = inject(DialogHistory);

    trigger.menuOpened
      .pipe(takeUntilDestroyed())
      .subscribe(() => dialogHistory.trackMenu(trigger));

  }

}
