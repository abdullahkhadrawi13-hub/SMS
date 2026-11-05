import { UserRole } from '../../core/models/user-role';

import { CardColor } from './card-colors';


// One color per role, the same shape as the card colors (card-colors.ts):
//
//   main: the avatar background
//   soft: a lighter version (the background of the profile card)
//   dark: the initials on the avatar, and text on the soft background
//
// Navy & Gold: every role has a light avatar with dark initials;
// the Admin is gold with navy initials.
// The values are CSS variables from src/tokens.css (no hex here),
// so they work in [style.--role-main]="..." bindings.
//
// Used by the navbar avatar, the user menu and the profile dialog.
export const ROLE_COLORS: Record<UserRole, CardColor> = {
  [UserRole.Admin]: {
    main: 'var(--role-admin-main)',
    soft: 'var(--role-admin-soft)',
    dark: 'var(--role-admin-dark)'
  },
  [UserRole.AssistantPrincipal]: {
    main: 'var(--role-ap-main)',
    soft: 'var(--role-ap-soft)',
    dark: 'var(--role-ap-dark)'
  },
  [UserRole.Teacher]: {
    main: 'var(--role-teacher-main)',
    soft: 'var(--role-teacher-soft)',
    dark: 'var(--role-teacher-dark)'
  },
  [UserRole.Student]: {
    main: 'var(--role-student-main)',
    soft: 'var(--role-student-soft)',
    dark: 'var(--role-student-dark)'
  },
  [UserRole.Parent]: {
    main: 'var(--role-parent-main)',
    soft: 'var(--role-parent-soft)',
    dark: 'var(--role-parent-dark)'
  },
};


// Gray, for a role the frontend does not know.
const UNKNOWN_ROLE_COLOR: CardColor = {
  main: 'var(--role-unknown-main)',
  soft: 'var(--role-unknown-soft)',
  dark: 'var(--role-unknown-dark)'
};


// Returns the color of a role.
export function getRoleColor(role: UserRole | null | undefined): CardColor {
  return (role != null && ROLE_COLORS[role]) || UNKNOWN_ROLE_COLOR;
}