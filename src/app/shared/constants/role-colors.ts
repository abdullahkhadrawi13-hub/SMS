import { UserRole } from '../../core/models/user-role';

import { CardColor } from './card-colors';


// One color per role, the same shape as the card colors (card-colors.ts):
//
//   main: the avatar background (white initials on it), the role text
//   soft: a light version (the background of the profile card)
//   dark: a dark version (text on the soft background)
//
// Used by the navbar avatar and the profile dialog.
// Every main color keeps white text readable (contrast above 4.5:1).
export const ROLE_COLORS: Record<UserRole, CardColor> = {
  [UserRole.Admin]:              { main: '#2554A4', soft: '#EAF2FF', dark: '#163A78' }, // blue
  [UserRole.AssistantPrincipal]: { main: '#534AB7', soft: '#EEEDFE', dark: '#3C3489' }, // purple
  [UserRole.Teacher]:            { main: '#0F6E56', soft: '#E1F5EE', dark: '#04342C' }, // teal
  [UserRole.Student]:            { main: '#854F0B', soft: '#FAEEDA', dark: '#633806' }, // amber
  [UserRole.Parent]:             { main: '#993556', soft: '#FBEAF0', dark: '#72243E' }, // pink
};


// Gray, for a role the frontend does not know.
const UNKNOWN_ROLE_COLOR: CardColor = {
  main: '#4B5563',
  soft: '#F3F4F6',
  dark: '#1F2937'
};


// Returns the color of a role.
export function getRoleColor(role: UserRole | null | undefined): CardColor {
  return (role != null && ROLE_COLORS[role]) || UNKNOWN_ROLE_COLOR;
}
