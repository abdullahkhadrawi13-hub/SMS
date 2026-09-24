import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { SchoolClass } from '../../features/classes/school-class';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface SchoolClassRequest {
  classNameAr: string;
  classNameEn: string;
  level: number;
  isGraduationGrade: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SchoolClasses {

  private http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:5253/api/SchoolClasses';

  getClasses(
    pageNumber: number,
    pageSize: number
  ): Observable<ApiResponse<PagedResult<SchoolClass>>> {

    return this.http.get<ApiResponse<PagedResult<SchoolClass>>>(
      `${this.apiUrl}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  getClass(
    schoolClassId: number
  ): Observable<ApiResponse<SchoolClass>> {

    return this.http.get<ApiResponse<SchoolClass>>(
      `${this.apiUrl}/${schoolClassId}`
    );
  }

  createClass(
    data: SchoolClassRequest
  ): Observable<ApiResponse<SchoolClass>> {

    return this.http.post<ApiResponse<SchoolClass>>(
      this.apiUrl,
      data
    );
  }

  updateClass(
    schoolClassId: number,
    data: SchoolClassRequest
  ): Observable<ApiResponse<SchoolClass>> {

    return this.http.put<ApiResponse<SchoolClass>>(
      `${this.apiUrl}/${schoolClassId}`,
      data
    );
  }

  updateClassStatus(
    schoolClassId: number,
    isActive: boolean
  ): Observable<ApiResponse<SchoolClass>> {

    return this.http.patch<ApiResponse<SchoolClass>>(
      `${this.apiUrl}/${schoolClassId}/status?isActive=${isActive}`,
      {}
    );
  }
}