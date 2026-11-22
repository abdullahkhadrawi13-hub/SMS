import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import {
  Student,
  StudentRequest,
  CreateStudentRequest
} from '../models/student';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class Students {

  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/Students`;


  getStudents(
    pageNumber: number = 1,
    pageSize: number = 10,
    search?: string,
    classId?: number,
    sectionId?: number,
    isActive?: boolean
  ): Observable<ApiResponse<PagedResult<Student>>> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search) {
      params = params.set('search', search);
    }

    if (classId !== undefined) {
      params = params.set('classId', classId);
    }

    if (sectionId !== undefined) {
      params = params.set('sectionId', sectionId);
    }

    if (isActive !== undefined) {
      params = params.set('isActive', isActive);
    }

    return this.http.get<ApiResponse<PagedResult<Student>>>(
      this.apiUrl,
      { params }
    );
  }


  getStudent(studentId: number): Observable<ApiResponse<Student>> {

    return this.http.get<ApiResponse<Student>>(
      `${this.apiUrl}/${studentId}`
    );
  }


  // GET /api/students/me (Student, PR #47)
  // The logged-in student's own profile: the same shape as getStudent().
  // 404 when the account has no student row; any other role gets 403.
  getMyProfile(): Observable<ApiResponse<Student>> {

    return this.http.get<ApiResponse<Student>>(
      `${this.apiUrl}/me`
    );
  }


  createStudent(
    data: CreateStudentRequest
  ): Observable<ApiResponse<Student>> {

    return this.http.post<ApiResponse<Student>>(
      this.apiUrl,
      data
    );
  }


  updateStudent(
    studentId: number,
    data: StudentRequest
  ): Observable<ApiResponse<Student>> {

    return this.http.put<ApiResponse<Student>>(
      `${this.apiUrl}/${studentId}`,
      data
    );
  }


  updateStudentStatus(
    studentId: number,
    isActive: boolean
  ): Observable<ApiResponse<Student>> {

    const params = new HttpParams()
      .set('isActive', isActive);

    return this.http.patch<ApiResponse<Student>>(
      `${this.apiUrl}/${studentId}/status`,
      null,
      { params }
    );
  }

}
