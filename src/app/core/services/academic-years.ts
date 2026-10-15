import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { environment } from '../../../environments/environment';

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
    `${environment.apiUrl}/academicyears`;


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