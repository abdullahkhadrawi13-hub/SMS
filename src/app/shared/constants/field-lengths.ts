// Maximum field lengths, matching the backend limits (PR #40).
// Used as [maxlength] on the form inputs so the user cannot
// type more than the backend accepts (instead of getting a 400 error).

// Each of the four user name parts (Arabic and English):
// students, teachers and parents.
export const USER_NAME_MAX_LENGTH = 50;

// The user's login name (loginId): 3 to 100 characters.
export const LOGIN_ID_MAX_LENGTH = 100;

// Academic term names (Arabic and English).
export const TERM_NAME_MAX_LENGTH = 100;

// The temporary password max (100) already lives in
// shared/utils/temp-password.ts (TEMP_PASSWORD_MAX_LENGTH).
