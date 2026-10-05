import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  getAcademicTerms(
    academicYearId?: number
  ): Observable<
    ApiResponse<AcademicTerm[]>
  > {

    let params = new HttpParams();

    // If an academic year is selected,
    // send it to the backend to get its terms.
    if (academicYearId !== undefined) {
      params = params.set(
        'academicYearId',
        academicYearId
      );
    }

    return this.http.get<
      ApiResponse<AcademicTerm[]>
    >(this.apiUrl, { params });
  }

}