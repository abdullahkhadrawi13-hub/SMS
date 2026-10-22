import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  RolloverPreview,
  RolloverRequest,
  RolloverResult
} from '../models/rollover';
import { environment } from '../../../environments/environment';


// Student rollover API (API Reference, section 13). Admin only.
@Injectable({
  providedIn: 'root'
})
export class RolloverService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/rollover`;


  // GET /api/rollover/preview?fromAcademicTermId={id}
  // What would happen to each active student of the source term.
  // Changes nothing, so it can be called again at any time
  // (for example after the Admin closes the old year's terms).
  getPreview(
    fromAcademicTermId: number
  ): Observable<ApiResponse<RolloverPreview>> {

    const params = new HttpParams()
      .set('fromAcademicTermId', fromAcademicTermId);

    return this.http.get<ApiResponse<RolloverPreview>>(
      `${this.apiUrl}/preview`,
      { params }
    );
  }


  // POST /api/rollover
  // Runs the rollover in one transaction: if any part fails, nothing changes.
  // A wrong admin password is 400 (never 401), and 5 wrong ones are 429.
  rollover(
    request: RolloverRequest
  ): Observable<ApiResponse<RolloverResult>> {

    return this.http.post<ApiResponse<RolloverResult>>(
      this.apiUrl,
      request
    );
  }
}
