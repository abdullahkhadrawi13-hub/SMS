import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';

import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatMenuTrigger } from '@angular/material/menu';

import { Observable, filter, take } from 'rxjs';


// =========================
// The browser's Back button closes the open dialog or menu
// =========================
//
// Without this, a dialog has no step of its own in the browser history:
// "Back" leaves the whole page (and the dialog closes with it).
//
// So every dialog, bottom sheet and ⋮ menu gets one history step when it
// opens (the URL stays the same), and:
//   - "Back" does what Esc does on the top one: a plain dialog or a menu
//     closes, a form with unsaved changes asks "Discard changes?" first,
//     a dialog that cannot close now (e.g. while saving) stays.
//     The page stays.
//   - closing it the usual way (✕, Cancel, Save, backdrop, Esc, a menu
//     item) takes its step back out, so the next "Back" is not a click
//     that does nothing.
//   - a dialog opened from a menu item takes the menu's step (the menu
//     closes at the same moment).
//   - a menu item or a link that goes to another page leaves the step in
//     the history (taking it out then would cancel that page): "Back"
//     from that page skips over it.
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
// Bottom sheets and menus have no shared "opened" event: they call
// trackBottomSheet() / trackMenu() (menus through the MenuBackClose
// directive, shared/directives/menu-back-close.ts).

// The history state key of a layer's step (its id).
const STEP_KEY = 'dialogStep';

// The id prefix of the dialogs that handle "Back" themselves.
const OWN_HISTORY_PREFIX = 'own-history:';

// How long to wait for the browser after location.back() at most.
const BACK_TIMEOUT_MS = 1000;


// The dialog id of a form that keeps itself in the URL.
export function ownHistoryDialogId(name: string): string {
  return OWN_HISTORY_PREFIX + name;
}


// One open dialog, bottom sheet or menu with its history step.
interface Layer {
  id: number;
  isMenu: boolean;
  // The page under it (path + query), when its step was added.
  url: string;
  // Closes it straight away (the page under it is gone).
  close: () => void;
  // Its step is not in the history any more (or another layer took it):
  // nothing to take out.
  stepGone: boolean;
}


@Injectable({ providedIn: 'root' })
export class DialogHistory {

  private readonly dialog = inject(MatDialog);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  // The open layers with a step, bottom to top.
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

  // The URL and the layer step shown before the last "Back" / "Forward"
  // (kept up to date after every navigation and every step we add).
  private lastUrl = '';
  private lastStepId: unknown;

  private started = false;


  start(): void {

    if (this.started) {
      return;
    }

    this.started = true;

    this.lastUrl = this.location.path();

    // Every MatDialog of the app (a page's own MatDialog reports here too).
    this.dialog.afterOpened.subscribe(ref => this.onDialogOpened(ref));

    // "Back" / "Forward" (and our own location.back()).
    this.location.subscribe(event => this.onPopState(event.state));

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.lastUrl = this.location.path();
        this.lastStepId = this.currentStepId();
      });

  }


  // A bottom sheet (opened with closeOnNavigation: false).
  trackBottomSheet(ref: MatBottomSheetRef<unknown>): void {

    this.track(false, () => ref.dismiss(), ref.afterDismissed());

  }


  // A ⋮ menu that has just opened (MenuBackClose).
  // menuClosed: as soon as it starts closing.
  trackMenu(trigger: MatMenuTrigger): void {

    this.track(true, () => trigger.closeMenu(), trigger.menuClosed);

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
    this.track(false, () => ref.close(), ref.beforeClosed());

  }


  private isOwnHistory(ref: MatDialogRef<unknown>): boolean {

    return ref.id.startsWith(OWN_HISTORY_PREFIX);

  }


  // closing: emits once it starts closing.
  private track(isMenu: boolean, close: () => void, closing: Observable<unknown>): void {

    const layer: Layer = {
      id: this.nextId++,
      isMenu,
      url: this.location.path(),
      close,
      stepGone: false
    };

    // A dialog opened from a menu item: the menu closes right after,
    // so the dialog takes the menu's step instead of adding one.
    const top = this.layers[this.layers.length - 1];
    const menuUnder = !isMenu && top?.isMenu ? top : undefined;

    if (menuUnder) {
      menuUnder.stepGone = true;
    }

    this.layers.push(layer);

    this.enqueue(done => {
      this.addStep(layer, menuUnder?.id);
      done();
    });

    closing.pipe(take(1)).subscribe(() => this.onLayerClosed(layer));

  }


  // A history step with the same URL, marked with the layer's id: a new
  // one, or in place of takeStepOf's step when that one is current.
  private addStep(layer: Layer, takeStepOf?: number): void {

    const state = (this.location.getState() ?? {}) as Record<string, unknown>;

    layer.url = this.location.path();

    const newState = { ...state, [STEP_KEY]: layer.id };

    if (takeStepOf !== undefined && state[STEP_KEY] === takeStepOf) {
      this.location.replaceState(layer.url, '', newState);
    } else {
      this.location.go(layer.url, '', newState);
    }

    this.lastStepId = layer.id;

  }


  // ===== Closing (✕, Cancel, Save, backdrop, Esc, a menu item, or "Back") =====

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
      // after it closes (e.g. a menu item or a link inside a dialog).
      setTimeout(() => {

        const state = this.location.getState() as Record<string, unknown> | null;

        // Not on its step any more, or the router is on its way to
        // another page: going back now would undo that. Leave it
        // ("Back" skips it later, see onPopState()).
        if (state?.[STEP_KEY] !== layer.id || this.router.currentNavigation()) {
          done();
          return;
        }

        this.goBack(done);

      });

    });

  }


  private goBack(done: () => void): void {

    this.moveInHistory(-1, done);

  }


  // -1: location.back(), 1: location.forward(). done: once the browser
  // has moved (popstate), or after a moment when it cannot.
  private moveInHistory(direction: -1 | 1, done: () => void): void {

    let finished = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        this.ownBackDone = null;
        done();
      }
    };

    this.ownBackDone = finish;

    if (direction === -1) {
      this.location.back();
    } else {
      this.location.forward();
    }

    // The browser did not answer: go on anyway.
    setTimeout(finish, BACK_TIMEOUT_MS);

  }


  // ===== "Back" / "Forward" =====

  private onPopState(state: unknown): void {

    const url = this.location.path();
    const cameFrom = this.lastUrl;
    const cameFromStep = this.lastStepId;

    const stepId = (state as Record<string, unknown> | null)?.[STEP_KEY];

    this.lastUrl = url;
    this.lastStepId = stepId;

    // Dialogs without a step close on "Back", as before.
    this.untracked.forEach(ref => ref.close());

    // Our own location.back() after a layer closed.
    if (this.ownBackDone) {
      this.ownBackDone();
      return;
    }

    const index = this.layers.findIndex(layer => layer.id === stepId);

    // The open layers whose step was just left.
    const left = this.layers.slice(index + 1);

    if (left.length > 0) {
      this.leaveLayers(left, url);
      return;
    }

    const onClosedStep = stepId !== undefined && index === -1;

    // "Back" from another page onto the step of a layer that is closed
    // already (a menu item or a link went to that page): on back to the
    // page itself, so this "Back" is not a click that does nothing.
    if (onClosedStep && url !== cameFrom) {
      this.enqueue(done => this.skipClosedSteps(-1, done));
      return;
    }

    // "Forward" from the page itself onto such a step: on forward, to the
    // page that menu item or link went to.
    if (onClosedStep && cameFromStep === undefined) {
      this.enqueue(done => this.skipClosedSteps(1, done));
    }

  }


  // Over the steps of closed layers (-1 back, 1 forward), until a step
  // that is not one (at most a few, and never twice on the same step).
  private skipClosedSteps(direction: -1 | 1, done: () => void, stepsLeft = 5): void {

    const before = this.currentStepId();

    this.moveInHistory(direction, () => {
      const stepId = this.currentStepId();

      const onClosedStep =
        stepId !== undefined && !this.layers.some(layer => layer.id === stepId);

      if (onClosedStep && stepId !== before && stepsLeft > 1) {
        this.skipClosedSteps(direction, done, stepsLeft - 1);
        return;
      }

      done();
    });

  }


  private currentStepId(): unknown {

    return (this.location.getState() as Record<string, unknown> | null)?.[STEP_KEY];

  }


  private leaveLayers(left: Layer[], url: string): void {

    // Back on another page (e.g. two steps at once): close them, as before.
    if (left.some(layer => layer.url !== url)) {
      left.forEach(layer => {
        layer.stepGone = true;
        layer.close();
      });
      return;
    }

    // Back over the step of the top layer: the page stays and the layer
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


  // The same as pressing Esc: the top dialog or menu (or the date picker
  // open inside a dialog) decides what Esc means for it.
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
