// View Transitions: which kind of move each screen change gets.
//
// The browser takes a picture of the screen before and after a change and
// animates between the two. The rules for each kind are in
// src/view-transitions.css; here we only decide the kind and write it on
// <html data-vt="...">, so the CSS can tell them apart:
//
//   nav     a page change inside the same layout (the sidebar links)
//   lang    the language switch (core/services/language.ts)
//   login   the login pages → the dashboard
//   logout  the dashboard → the login page
//
// Used by app.config.ts (withViewTransitions) and the Language service.

import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

export type ViewTransitionKind = 'nav' | 'lang' | 'login' | 'logout';

// The layout of each top-level route, from its data in app.routes.ts.
type AppLayout = 'auth' | 'dashboard';


// The transition running now. A new one cancels the old one, so only
// the newest may clear data-vt when it ends.
let currentTransition: ViewTransition | null = null;


// Writes the kind on <html> for as long as the transition runs.
export function markViewTransition(transition: ViewTransition, kind: ViewTransitionKind): void {
  const html = document.documentElement;

  currentTransition = transition;
  html.dataset['vt'] = kind;

  transition.finished.finally(() => {
    if (currentTransition === transition) {
      currentTransition = null;
      delete html.dataset['vt'];
    }
  });
}


// "Reduce motion" is on in the device settings: no transitions at all.
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}


// For withViewTransitions({ onViewTransitionCreated }) in app.config.ts.
// Runs at the start of every route change.
export function onRouteViewTransition({ transition, from, to }: ViewTransitionInfo): void {

  // Only the query params changed (search, filters, page, ?tab=):
  // the screen changes at once, with no fade.
  if (pathOf(from) === pathOf(to) || prefersReducedMotion()) {
    transition.skipTransition();
    return;
  }

  markViewTransition(transition, routeKind(from, to));
}


// login / logout when the layout changes, nav inside the same layout.
function routeKind(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): ViewTransitionKind {
  const fromLayout = layoutOf(from);
  const toLayout = layoutOf(to);

  if (!fromLayout || !toLayout || fromLayout === toLayout) {
    return 'nav';
  }

  return toLayout === 'dashboard' ? 'login' : 'logout';
}


function layoutOf(root: ActivatedRouteSnapshot): AppLayout | null {
  return root.firstChild?.data['layout'] ?? null;
}


// The path without the query params, e.g. "students/12".
function pathOf(root: ActivatedRouteSnapshot): string {
  const segments: string[] = [];

  let route: ActivatedRouteSnapshot | null = root;

  while (route) {
    segments.push(...route.url.map(segment => segment.path));
    route = route.firstChild;
  }

  return segments.join('/');
}
