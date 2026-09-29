import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  SchoolClass,
  SchoolClassSimpleDto,
  CreateSchoolClassRequest,
  UpdateSchoolClassRequest
} from '../../features/classes/school-class';

export interface SchoolClassApiResponse<T> {
  success: boolean;
  messageAr: string;
  messageEn: string;
  data: T;
}

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
  ): Observable<SchoolClassApiResponse<SchoolClassPagedResult>> {

    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    return this.http.get<
      SchoolClassApiResponse<SchoolClassPagedResult>
    >(this.apiUrl, { params });
  }

  // GET /api/SchoolClasses/active
  getActiveSchoolClasses(): Observable<
    SchoolClassApiResponse<SchoolClassSimpleDto[]>
  > {

    return this.http.get<
      SchoolClassApiResponse<SchoolClassSimpleDto[]>
    >(`${this.apiUrl}/active`);
  }

  // GET /api/SchoolClasses/{schoolClassId}
  getSchoolClass(
    schoolClassId: number
  ): Observable<SchoolClassApiResponse<SchoolClass>> {

    return this.http.get<
      SchoolClassApiResponse<SchoolClass>
    >(`${this.apiUrl}/${schoolClassId}`);
  }

  // POST /api/SchoolClasses
  createSchoolClass(
    request: CreateSchoolClassRequest
  ): Observable<SchoolClassApiResponse<SchoolClass>> {

    return this.http.post<
      SchoolClassApiResponse<SchoolClass>
    >(this.apiUrl, request);
  }

  // PUT /api/SchoolClasses/{schoolClassId}
  updateSchoolClass(
    schoolClassId: number,
    request: UpdateSchoolClassRequest
  ): Observable<SchoolClassApiResponse<SchoolClass>> {

    return this.http.put<
      SchoolClassApiResponse<SchoolClass>
    >(`${this.apiUrl}/${schoolClassId}`, request);
  }

  // PATCH /api/SchoolClasses/{schoolClassId}/status
  updateSchoolClassStatus(
    schoolClassId: number,
    isActive: boolean
  ): Observable<SchoolClassApiResponse<SchoolClass>> {

    const params = new HttpParams()
      .set('isActive', isActive);

    return this.http.patch<
      SchoolClassApiResponse<SchoolClass>
    >(
      `${this.apiUrl}/${schoolClassId}/status`,
      null,
      { params }
    );
  }
}