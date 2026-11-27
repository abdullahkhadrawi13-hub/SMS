import { DOCUMENT, Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';


// =========================
// View Transitions: the motion between two states of the app
// =========================
//
// One kind of motion runs at a time. While it runs, its kind is written on
// <html data-vt="...">, and styles.css ("View Transitions") names only the
// parts of the screen that move for that kind. Everything else (the root)
// does not animate: what did not change stays still.
//
//   nav      a page from the sidebar or a link: only the page changes
//            (the old one goes out faster than the new one comes in);
//            the sidebar and the navbar stay where they are.
//   signin   login → dashboard: the navy panel stays solid and becomes
//            the sidebar (empty), the sidebar links appear last.
//   signout  dashboard → login (logout, end of session): the same, back,
//            and faster than signin.
//   lang     the language button: the sidebar (the navy panel on the
//            login page) fades out where it is and fades in on the other
//            side; the rest fades. Nothing slides (option E, 27 Nov 2026).
//   theme    the light / dark switch: a short fade of the whole screen.
//   none     nothing moves (see below).
//
// No motion at all ("none"):
//   - when only the query params change (search, filters, page, ?tab=,
//     ?form=new / ?edit=...): the same page stays, so it just updates.
//   - when the device asks for reduced motion.
//   - in a browser without View Transitions (the change is instant).
//   A newer navigation that starts while a page is still fading in (e.g. a
//   page that adds ?termId= as soon as it opens) ends that fade at once:
//   the browser runs one transition at a time.
//
// The durations are in src/tokens.css (--dur-page-in, --dur-lang-out, ...).
//
// The router calls onRouterTransition() (app.config.ts, withViewTransitions).
// The Language and Theme services call run().

export type TransitionKind = 'nav' | 'signin' | 'signout' | 'lang' | 'theme' | 'none';

// app.routes.ts marks the two layout routes with data: { layout: ... }
type LayoutName = 'auth' | 'dashboard';

@Injectable({
  providedIn: 'root'
})
export class ViewTransitions {

  private readonly document = inject(DOCUMENT);

  // The transition running now (null = none).
  private active: ViewTransition | null = null;


  // The language and the theme: runs `update` inside a transition of this kind.
  // `update` changes the screen; when it returns a promise, the new screen
  // is taken after it resolves.
  // The returned promise resolves when the motion is over (at once when
  // there is no motion).
  async run(kind: TransitionKind, update: () => void | Promise<void>): Promise<void> {

    if (!this.canAnimate()) {
      await update();
      return;
    }

    const root = this.document.documentElement;

    // <html data-vt-phase="new"> while the new screen is drawn and taken,
    // so styles.css can give a part one name in the old picture and
    // another in the new one (the language: "navy-old" / "navy-new").
    // Cleared first: a transition cut short must not leave it behind.
    delete root.dataset['vtPhase'];

    // A transition still running is skipped by the browser (it jumps to
    // its end) when a new one starts: two quick clicks never get stuck.
    const transition = this.document.startViewTransition(() => {
      root.dataset['vtPhase'] = 'new';
      return update();
    });

    this.track(kind, transition);

    // finished never rejects for a skipped transition, only when update failed
    await transition.finished.catch(() => undefined);
  }


  // Called by the router for every navigation (onViewTransitionCreated).
  onRouterTransition({ transition, from, to }: ViewTransitionInfo): void {

    // The same page with other query params, or reduced motion: no motion.
    // The transition is not skipped (skipTransition() makes the router log
    // an AbortError in the console on every search letter); with the kind
    // "none" nothing is named and nothing animates, so it ends at once.
    const noMotion = !this.prefersMotion() || this.pathOf(from) === this.pathOf(to);

    this.track(noMotion ? 'none' : this.navigationKind(from, to), transition);
  }


  // From the login pages to the dashboard: signin. The other way: signout.
  private navigationKind(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): TransitionKind {

    const fromLayout = this.layoutOf(from);
    const toLayout = this.layoutOf(to);

    if (fromLayout === 'auth' && toLayout === 'dashboard') {
      return 'signin';
    }

    if (fromLayout === 'dashboard' && toLayout === 'auth') {
      return 'signout';
    }

    return 'nav';
  }

  private layoutOf(root: ActivatedRouteSnapshot): LayoutName | null {
    return root.firstChild?.data['layout'] ?? null;
  }

  // The path of a route tree without the query params: "students/12".
  private pathOf(root: ActivatedRouteSnapshot): string {

    const parts: string[] = [];

    for (let route: ActivatedRouteSnapshot | null = root; route; route = route.firstChild) {
      parts.push(...route.url.map(segment => segment.path));
    }

    return parts.join('/');
  }


  // <html data-vt="kind"> while this transition runs.
  // A transition that was cut by a newer one does not remove the newer
  // one's kind when it ends.
  private track(kind: TransitionKind, transition: ViewTransition): void {

    const root = this.document.documentElement;

    this.active = transition;
    root.dataset['vt'] = kind;

    transition.finished
      .catch(() => undefined)
      .finally(() => {
        if (this.active === transition) {
          this.active = null;
          delete root.dataset['vt'];
          delete root.dataset['vtPhase'];
        }
      });
  }

  private canAnimate(): boolean {
    return typeof this.document.startViewTransition === 'function' && this.prefersMotion();
  }

  private prefersMotion(): boolean {
    return !this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
