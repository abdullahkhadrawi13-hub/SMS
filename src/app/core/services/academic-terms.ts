import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  AcademicTerm,
  CreateAcademicTermRequest,
  UpdateAcademicTermRequest
} from '../models/academic-term';
import { environment } from '../../../environments/environment';


// AcademicTerms API (API Reference, section 7).
// Reads: Admin and AssistantPrincipal. Writes: Admin only.
@Injectable({
  providedIn: 'root'
})
export class AcademicTermsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/academicterms`;


  // GET /api/academicterms
  // Returns all academic terms (no filter).
  getAcademicTerms(): Observable<
    ApiResponse<AcademicTerm[]>
  > {

    return this.http.get<
      ApiResponse<AcademicTerm[]>
    >(this.apiUrl);
  }


  // GET /api/academicterms/{id}
  // Returns one academic term.
  getAcademicTermById(
    academicTermId: number
  ): Observable<
    ApiResponse<AcademicTerm>
  > {

    return this.http.get<
      ApiResponse<AcademicTerm>
    >(`${this.apiUrl}/${academicTermId}`);
  }


  // GET /api/academicterms/by-year/{academicYearId}
  // Returns only the terms of the given academic year,
  // ordered by termNumber. Returns an empty array when
  // the year has no terms (not an error).
  getAcademicTermsByYear(
    academicYearId: number
  ): Observable<
    ApiResponse<AcademicTerm[]>
  > {

    return this.http.get<
      ApiResponse<AcademicTerm[]>
    >(`${this.apiUrl}/by-year/${academicYearId}`);
  }


  // POST /api/academicterms (Admin)
  // Returns the created term.
  createAcademicTerm(
    request: CreateAcademicTermRequest
  ): Observable<
    ApiResponse<AcademicTerm>
  > {

    return this.http.post<
      ApiResponse<AcademicTerm>
    >(this.apiUrl, request);
  }


  // PUT /api/academicterms/{id} (Admin)
  // Also used to activate / deactivate a term (only isActive changes).
  // Returns data: null.
  updateAcademicTerm(
    academicTermId: number,
    request: UpdateAcademicTermRequest
  ): Observable<
    ApiResponse<null>
  > {

    return this.http.put<
      ApiResponse<null>
    >(`${this.apiUrl}/${academicTermId}`, request);
  }


  // PATCH /api/academicterms/{id}/current (Admin, no body)
  // Makes this term the current term. The backend also makes its year
  // the current year and clears the old term and year, in one transaction.
  setCurrentAcademicTerm(
    academicTermId: number
  ): Observable<
    ApiResponse<unknown>
  > {

    return this.http.patch<
      ApiResponse<unknown>
    >(`${this.apiUrl}/${academicTermId}/current`, null);
  }


  // PATCH /api/academicterms/{id}/grades/close (Admin, no body)
  // Closes (approves) the term's grades: nobody can change marks,
  // assessments, subject plans, assignments or placements of this term
  // until it is opened again. Already closed → 200, nothing changes.
  // Returns the updated term.
  closeGrades(
    academicTermId: number
  ): Observable<
    ApiResponse<AcademicTerm>
  > {

    return this.http.patch<
      ApiResponse<AcademicTerm>
    >(`${this.apiUrl}/${academicTermId}/grades/close`, null);
  }


  // PATCH /api/academicterms/{id}/grades/open (Admin, no body)
  // Opens the term's grades again. Already open → 200, nothing changes.
  // A term closed by the year-end rollover can never be opened (400).
  // Returns the updated term.
  openGrades(
    academicTermId: number
  ): Observable<
    ApiResponse<AcademicTerm>
  > {

    return this.http.patch<
      ApiResponse<AcademicTerm>
    >(`${this.apiUrl}/${academicTermId}/grades/open`, null);
  }

}
