// User accounts (API Reference, section 3: Authentication & Users).
// Admin only.


// POST /api/users/{userId}/reset-password
//
// adminPassword:     the logged-in Admin's own password, to confirm.
//                    Wrong → 400 "Admin password is incorrect.".
//                    5 wrong (here, at login or in the rollover) → 429.
// temporaryPassword: the user's new password, 8 to 100 characters.
//                    The user must change it at the next login
//                    (mustChangePassword becomes true), and every older
//                    token of the user stops working at once.
//
// Success: 200 with data: null.
export interface ResetPasswordRequest {
  adminPassword: string;
  temporaryPassword: string;
}
