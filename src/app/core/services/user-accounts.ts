import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { ResetPasswordRequest } from '../models/user-account';
import { environment } from '../../../environments/environment';


// Users API (API Reference, section 3). Admin only.
//
// Not the same as the User service (core/services/user.ts), which keeps the
// logged-in user. This one manages the accounts of other users.
//
// For now it only resets passwords; the users management page
// (list, edit, activate) will add its methods here.
@Injectable({
  providedIn: 'root',
})
export class UserAccountsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/users`;


  // POST /api/users/{userId}/reset-password
  // Any user, any role. Takes about a second (password hashing is slow
  // on purpose), so the caller shows a loading state.
  resetPassword(
    userId: number,
    request: ResetPasswordRequest
  ): Observable<ApiResponse<null>> {

    return this.http.post<ApiResponse<null>>(
      `${this.apiUrl}/${userId}/reset-password`,
      request
    );
  }
}
