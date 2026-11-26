import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

import { Observable, take } from 'rxjs';


// =========================
// The browser's Back button closes the open dialog
// =========================
//
// Without this, a dialog has no step of its own in the browser history:
// "Back" leaves the whole page (and the dialog closes with it).
//
// So every dialog gets one history step when it opens (the URL stays the
// same), and:
//   - "Back" does what Esc does on the top dialog: a plain dialog closes,
//     a form with unsaved changes asks "Discard changes?" first, a dialog
//     that cannot close now (e.g. while saving) stays. The page stays.
//   - closing it the usual way (✕, Cancel, Save, backdrop, Esc) takes its
//     step back out, so the next "Back" is not a click that does nothing.
//   - "Back" two steps at once (to another page) closes it, as before.
//
// Not handled here:
//   - the student, teacher and parent forms: they are in the URL
//     (?form=new / ?edit=12) and handle "Back" themselves. They open with
//     id: ownHistoryDialogId(...). A dialog opened over one of them
//     (e.g. its "Discard changes?") is left as before.
//   - a dialog opened while the router is leaving a page (e.g. the grades
//     page's "Leave without saving?"): it belongs to that navigation.
// Both of these still close on "Back", like every dialog did before.
//
// Started once in app.config.ts. Every dialog opens with
// closeOnNavigation: false (MAT_DIALOG_DEFAULT_OPTIONS there), so "Back"
// does not close it before this service decides.
// Bottom sheets have no shared "opened" event: they call trackBottomSheet().

// The history state key of a dialog's step (its layer id).
const STEP_KEY = 'dialogStep';

// The id prefix of the dialogs that handle "Back" themselves.
const OWN_HISTORY_PREFIX = 'own-history:';

// How long to wait for the browser after location.back() at most.
const BACK_TIMEOUT_MS = 1000;


// The dialog id of a form that keeps itself in the URL.
export function ownHistoryDialogId(name: string): string {
  return OWN_HISTORY_PREFIX + name;
}


// One open dialog (or bottom sheet) with its history step.
interface Layer {
  id: number;
  // The page under it (path + query), when its step was added.
  url: string;
  // Closes it straight away (the page under it is gone).
  close: () => void;
  // Its step is not in the history any more: nothing to take out.
  stepGone: boolean;
}


@Injectable({ providedIn: 'root' })
export class DialogHistory {

  private readonly dialog = inject(MatDialog);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  // The open dialogs with a step, bottom to top.
  private readonly layers: Layer[] = [];
  private nextId = 1;

  // Dialogs without a step (see "Not handled here"): closed on "Back".
  private readonly untracked = new Set<MatDialogRef<unknown>>();

  // History changes run one after another: location.back() is not
  // finished until the browser says so (popstate).
  private readonly queue: Array<(done: () => void) => void> = [];
  private running = false;

  // Set while our own location.back() waits for the browser.
  private ownBackDone: (() => void) | null = null;

  private started = false;


  start(): void {

    if (this.started) {
      return;
    }

    this.started = true;

    // Every MatDialog of the app (a page's own MatDialog reports here too).
    this.dialog.afterOpened.subscribe(ref => this.onDialogOpened(ref));

    // "Back" / "Forward" (and our own location.back()).
    this.location.subscribe(event => this.onPopState(event.state));

  }


  // A bottom sheet (opened with closeOnNavigation: false).
  trackBottomSheet(ref: MatBottomSheetRef<unknown>): void {

    this.track(() => ref.dismiss(), ref.afterDismissed());

  }


  // ===== Opening =====

  private onDialogOpened(ref: MatDialogRef<unknown>): void {

    if (this.isOwnHistory(ref)) {
      return;
    }

    const overOwnHistoryForm = this.dialog.openDialogs
      .some(open => open !== ref && this.isOwnHistory(open));

    if (overOwnHistoryForm || this.router.currentNavigation()) {
      this.untracked.add(ref);
      ref.afterClosed().subscribe(() => this.untracked.delete(ref));
      return;
    }

    // beforeClosed: as soon as it starts closing, so a dialog opened right
    // after it (e.g. the "Saved" message) gets its step after this one
    // is taken out.
    this.track(() => ref.close(), ref.beforeClosed());

  }


  private isOwnHistory(ref: MatDialogRef<unknown>): boolean {

    return ref.id.startsWith(OWN_HISTORY_PREFIX);

  }


  // closing: emits once it starts closing.
  private track(close: () => void, closing: Observable<unknown>): void {

    const layer: Layer = {
      id: this.nextId++,
      url: this.location.path(),
      close,
      stepGone: false
    };

    this.layers.push(layer);

    this.enqueue(done => {
      this.addStep(layer);
      done();
    });

    closing.pipe(take(1)).subscribe(() => this.onLayerClosed(layer));

  }


  // A new history step with the same URL, marked with the layer's id.
  private addStep(layer: Layer): void {

    const state = (this.location.getState() ?? {}) as Record<string, unknown>;

    layer.url = this.location.path();

    this.location.go(layer.url, '', { ...state, [STEP_KEY]: layer.id });

  }


  // ===== Closing (✕, Cancel, Save, backdrop, Esc, or "Back") =====

  private onLayerClosed(layer: Layer): void {

    const index = this.layers.indexOf(layer);

    if (index !== -1) {
      this.layers.splice(index, 1);
    }

    if (layer.stepGone) {
      return;
    }

    this.enqueue(done => {

      // Wait a moment: the page may start going somewhere else right
      // after the dialog closes (e.g. a link inside it).
      setTimeout(() => {

        const state = this.location.getState() as Record<string, unknown> | null;

        // Not on its step any more, or the router is on its way to
        // another page: going back now would undo that. Leave it.
        if (state?.[STEP_KEY] !== layer.id || this.router.currentNavigation()) {
          done();
          return;
        }

        this.goBack(done);

      });

    });

  }


  private goBack(done: () => void): void {

    let finished = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        this.ownBackDone = null;
        done();
      }
    };

    this.ownBackDone = finish;

    this.location.back();

    // The browser did not answer: go on anyway.
    setTimeout(finish, BACK_TIMEOUT_MS);

  }


  // ===== "Back" / "Forward" =====

  private onPopState(state: unknown): void {

    // Our own location.back() after a dialog closed.
    if (this.ownBackDone) {
      this.ownBackDone();
      return;
    }

    // Dialogs without a step close on "Back", as before.
    this.untracked.forEach(ref => ref.close());

    if (this.layers.length === 0) {
      return;
    }

    const stepId = (state as Record<string, unknown> | null)?.[STEP_KEY];
    const index = this.layers.findIndex(layer => layer.id === stepId);

    // The dialogs whose step was just left.
    const left = this.layers.slice(index + 1);

    if (left.length === 0) {
      return;
    }

    const url = this.location.path();

    // Back on another page (e.g. two steps at once): close them, as before.
    if (left.some(layer => layer.url !== url)) {
      left.forEach(layer => {
        layer.stepGone = true;
        layer.close();
      });
      return;
    }

    // Back over the step of the top dialog: the page stays and the dialog
    // gets its step again, then it is asked to close like with Esc. When it
    // closes, onLayerClosed() takes the step back out.
    this.enqueue(done => {
      left.forEach(layer => this.addStep(layer));
      done();
    });

    this.enqueue(done => {
      this.pressEscape();
      done();
    });

  }


  // The same as pressing Esc: the top dialog (or the menu / date picker
  // open inside it) decides what Esc means for it.
  private pressEscape(): void {

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true
    });

    // Angular Material checks the old keyCode (27).
    Object.defineProperty(event, 'keyCode', { get: () => 27 });

    this.document.body.dispatchEvent(event);

  }


  // ===== Queue =====

  private enqueue(job: (done: () => void) => void): void {

    this.queue.push(job);
    this.runNext();

  }


  private runNext(): void {

    if (this.running) {
      return;
    }

    const job = this.queue.shift();

    if (!job) {
      return;
    }

    this.running = true;

    job(() => {
      this.running = false;
      this.runNext();
    });

  }

}
