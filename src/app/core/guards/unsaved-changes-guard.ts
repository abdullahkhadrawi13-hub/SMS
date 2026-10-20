import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';


// A page that can stop the user from leaving with unsaved changes.
// canLeave() returns true when nothing is unsaved; otherwise the page
// asks the user (its own confirmation dialog) and answers with their choice.
export interface LeaveConfirmation {
  canLeave(): boolean | Observable<boolean>;
}


// Asks the page before leaving it (another sidebar page, logout, back button...).
// Used by the grades page: leaving with marks that are not saved yet
// shows "Leave without saving?" first.
//
// Note: closing or refreshing the browser tab does not go through the router;
// the page handles that itself (window:beforeunload).
export const unsavedChangesGuard: CanDeactivateFn<LeaveConfirmation> = (
  component
) => {

  return component?.canLeave ? component.canLeave() : true;
};
