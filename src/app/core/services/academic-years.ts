import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';

export interface AcademicYear {
  academicYearId: number;
  yearName: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AcademicYearsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:5253/api/academicyears';


  // GET /api/academicyears
  // Returns all academic years for lookup lists.
  getAcademicYears(): Observable<
    ApiResponse<AcademicYear[]>
  > {

    return this.http.get<
      ApiResponse<AcademicYear[]>
    >(this.apiUrl);
  }

}