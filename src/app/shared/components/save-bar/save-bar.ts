import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


// A unique id for each bar on the page, so the Save button can point at
// the line that says why it is disabled (aria-describedby).
let nextSaveBarId = 0;


// The unsaved-changes bar (spec: "شريط التغييرات غير المحفوظة").
// One component for every screen that saves in one go:
//   - Grades sheet (grades-page)
//   - Attendance record sheet (record-sheet)
//   - Attendance officer (attendance-officer-page)
//
// The parent page decides when to show it (only when there is something to
// save) and passes the texts already translated. The bar only draws them:
//
//   [start]  dot · title · one line (hint or error)      [end]  Undo · Save
//
// - error:   a problem that must be fixed first (red line, Save disabled).
// - canSave: false = Save disabled for a normal reason; the hint says why
//            (e.g. "choose a status for every student").
// - saving:  Save keeps its navy colour with a spinner and cannot be pressed
//            again; Undo is disabled.
//
// Colours: --save-* tokens (src/tokens.css). Save is the screen's one
// primary (navy) button, so it uses Material's filled button as everywhere.
@Component({
  selector: 'app-save-bar',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './save-bar.html',
  styleUrl: './save-bar.css',
})
export class SaveBar {

  // ===== Inputs (all texts are already translated by the parent) =====

  // "4 unsaved changes", "New attendance officer: …"
  readonly title = input.required<string>();

  // One short line under the title (hidden on the phone unless it is
  // the reason Save is disabled).
  readonly hint = input<string | null>(null);

  // What must be fixed before saving. Shown instead of the hint.
  readonly error = input<string | null>(null);

  readonly undoLabel = input.required<string>();
  readonly saveLabel = input.required<string>();
  readonly savingLabel = input.required<string>();

  // Material Symbols name of the icon in the Save button.
  readonly saveIcon = input('save');

  // True while the parent page is saving.
  readonly saving = input(false);

  // False when Save is not allowed yet for a normal reason (see hint).
  readonly canSave = input(true);


  // ===== Outputs (the parent page does the real work) =====

  readonly undo = output<void>();
  readonly save = output<void>();


  // The id of the hint / error line.
  readonly noteId = `save-bar-note-${nextSaveBarId++}`;

  // Save cannot be used: there is an error, or the parent says not yet.
  // (While saving the button is not disabled, so it keeps its colour;
  // onSave() ignores the click instead.)
  readonly blocked = computed(
    () => !!this.error() || !this.canSave()
  );


  onSave(): void {

    if (this.saving() || this.blocked()) {
      return;
    }

    this.save.emit();
  }
}
