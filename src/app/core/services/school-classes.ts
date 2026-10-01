import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  SchoolClass,
  SchoolClassSimpleDto,
  CreateSchoolClassRequest,
  UpdateSchoolClassRequest
} from '../../features/classes/school-class';

export interface SchoolClassPagedResult {
  items: SchoolClass[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class SchoolClassesService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:5253/api/SchoolClasses';

  // GET /api/SchoolClasses
  getSchoolClasses(
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<ApiResponse<SchoolClassPagedResult>> {

    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    return this.http.get<
      ApiResponse<SchoolClassPagedResult>
    >(this.apiUrl, { params });
  }

  // GET /api/SchoolClasses/active
  getActiveSchoolClasses(): Observable<
    ApiResponse<SchoolClassSimpleDto[]>
  > {

    return this.http.get<
      ApiResponse<SchoolClassSimpleDto[]>
    >(`${this.apiUrl}/active`);
  }

  // GET /api/SchoolClasses/{schoolClassId}
  getSchoolClass(
    schoolClassId: number
  ): Observable<ApiResponse<SchoolClass>> {

    return this.http.get<
      ApiResponse<SchoolClass>
    >(`${this.apiUrl}/${schoolClassId}`);
  }

  // POST /api/SchoolClasses
  createSchoolClass(
    request: CreateSchoolClassRequest
  ): Observable<ApiResponse<SchoolClass>> {

    return this.http.post<
      ApiResponse<SchoolClass>
    >(this.apiUrl, request);
  }

  // PUT /api/SchoolClasses/{schoolClassId}
  updateSchoolClass(
    schoolClassId: number,
    request: UpdateSchoolClassRequest
  ): Observable<ApiResponse<SchoolClass>> {

    return this.http.put<
      ApiResponse<SchoolClass>
    >(`${this.apiUrl}/${schoolClassId}`, request);
  }

  // PATCH /api/SchoolClasses/{schoolClassId}/status
  updateSchoolClassStatus(
    schoolClassId: number,
    isActive: boolean
  ): Observable<ApiResponse<SchoolClass>> {

    const params = new HttpParams()
      .set('isActive', isActive);

    return this.http.patch<
      ApiResponse<SchoolClass>
    >(
      `${this.apiUrl}/${schoolClassId}/status`,
      null,
      { params }
    );
  }
}