import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';

export interface AcademicTerm {
  academicTermId: number;
  academicYearId: number;
  termNumber: number;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isCurrent: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AcademicTermsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:5253/api/academicterms';


  // GET /api/academicterms
  // Returns all academic terms for lookup lists.
  getAcademicTerms(): Observable<
    ApiResponse<AcademicTerm[]>
  > {

    return this.http.get<
      ApiResponse<AcademicTerm[]>
    >(this.apiUrl);
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

}