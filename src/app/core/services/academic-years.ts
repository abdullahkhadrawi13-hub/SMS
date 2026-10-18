import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  AcademicYear,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest
} from '../models/academic-year';
import { environment } from '../../../environments/environment';


// AcademicYears API (API Reference, section 7).
// Reads: Admin and AssistantPrincipal. Writes: Admin only.
// There is no PATCH /api/academicyears/{id}/current by design:
// the current year follows the current term (see AcademicTermsService).
@Injectable({
  providedIn: 'root'
})
export class AcademicYearsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/academicyears`;


  // GET /api/academicyears
  // Returns all academic years.
  getAcademicYears(): Observable<
    ApiResponse<AcademicYear[]>
  > {

    return this.http.get<
      ApiResponse<AcademicYear[]>
    >(this.apiUrl);
  }


  // GET /api/academicyears/{id}
  // Returns one academic year.
  getAcademicYearById(
    academicYearId: number
  ): Observable<
    ApiResponse<AcademicYear>
  > {

    return this.http.get<
      ApiResponse<AcademicYear>
    >(`${this.apiUrl}/${academicYearId}`);
  }


  // POST /api/academicyears (Admin)
  // Returns the created year.
  createAcademicYear(
    request: CreateAcademicYearRequest
  ): Observable<
    ApiResponse<AcademicYear>
  > {

    return this.http.post<
      ApiResponse<AcademicYear>
    >(this.apiUrl, request);
  }


  // PUT /api/academicyears/{id} (Admin)
  // Returns data: null.
  updateAcademicYear(
    academicYearId: number,
    request: UpdateAcademicYearRequest
  ): Observable<
    ApiResponse<null>
  > {

    return this.http.put<
      ApiResponse<null>
    >(`${this.apiUrl}/${academicYearId}`, request);
  }

}
