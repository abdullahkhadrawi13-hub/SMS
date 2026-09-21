import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { Student } from '../../features/students/student';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface StudentRequest {
  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  loginId: string;
  phoneNumber: string;

  classId: number;
  sectionId: number;
}

export interface CreateStudentRequest extends StudentRequest {
  temporaryPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class Students {

  private http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:5253/api/Students';


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