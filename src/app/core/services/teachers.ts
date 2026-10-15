import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import {
  TeacherListDto,
  CreateTeacherRequest,
  UpdateTeacherRequest
} from '../models/teacher';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class TeachersService {

  // Base URL of the Teachers API.
  private readonly apiUrl =
    `${environment.apiUrl}/teachers`;

  private readonly http = inject(HttpClient);


  // Gets a paginated list of teachers.
  getTeachers(
    pageNumber = 1,
    pageSize = 10,
    search?: string,
    isActive?: boolean
  ): Observable<ApiResponse<PagedResult<TeacherListDto>>> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    if (isActive !== undefined) {
      params = params.set('isActive', isActive);
    }

    return this.http.get<ApiResponse<PagedResult<TeacherListDto>>>(
      this.apiUrl,
      { params }
    );
  }


  // Gets a single teacher by teacherId.
  getTeacher(
    teacherId: number
  ): Observable<ApiResponse<TeacherListDto>> {

    return this.http.get<ApiResponse<TeacherListDto>>(
      `${this.apiUrl}/${teacherId}`
    );
  }


  // Creates a new teacher account and teacher record.
  createTeacher(
    data: CreateTeacherRequest
  ): Observable<ApiResponse<TeacherListDto>> {

    return this.http.post<ApiResponse<TeacherListDto>>(
      this.apiUrl,
      data
    );
  }


  // Edits a teacher and returns the updated teacher.
  updateTeacher(
    teacherId: number,
    data: UpdateTeacherRequest
  ): Observable<ApiResponse<TeacherListDto>> {

    return this.http.put<ApiResponse<TeacherListDto>>(
      `${this.apiUrl}/${teacherId}`,
      data
    );
  }


  // Activates or deactivates a teacher account.
  // isActive is sent as a query parameter, with an empty body.
  updateTeacherStatus(
    teacherId: number,
    isActive: boolean
  ): Observable<ApiResponse<TeacherListDto>> {

    const params = new HttpParams()
      .set('isActive', isActive);

    return this.http.patch<ApiResponse<TeacherListDto>>(
      `${this.apiUrl}/${teacherId}/status`,
      null,
      { params }
    );
  }
}
