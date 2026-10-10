import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';


// Represents one teacher returned by the API.
export interface TeacherListDto {
  teacherId: number;
  teacherNumber: string;
  userId: number;

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

  isActive: boolean;
  mustChangePassword: boolean;
  role: number;
}


// Represents the paginated response returned by the API.
export interface TeacherPagedResult {
  items: TeacherListDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}


// Data required when creating a teacher.
export interface CreateTeacherRequest {
  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  loginId: string;
  temporaryPassword: string;
  phoneNumber: string;
}


// Data required when editing a teacher (UpdateUserDto).
// Same fields as creation, without the password. Every field is required.
export interface UpdateTeacherRequest {
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
}


@Injectable({
  providedIn: 'root',
})
export class TeachersService {

  // Base URL of the Teachers API.
  private readonly apiUrl =
    'http://localhost:5253/api/teachers';

  private readonly http = inject(HttpClient);


  // Gets a paginated list of teachers.
  getTeachers(
    pageNumber = 1,
    pageSize = 10,
    search?: string,
    isActive?: boolean
  ): Observable<ApiResponse<TeacherPagedResult>> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    if (isActive !== undefined) {
      params = params.set('isActive', isActive);
    }

    return this.http.get<ApiResponse<TeacherPagedResult>>(
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