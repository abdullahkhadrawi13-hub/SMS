import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  TeacherAssignment,
  CreateTeacherAssignmentRequest,
  UpdateTeacherAssignmentRequest,
  TeacherAssignmentFilters
} from '../models/teacher-assignment';
import { environment } from '../../../environments/environment';


// TeacherAssignments API.
// Writes (create, edit, activate / deactivate): Admin only.
// Reads (list and single): Admin and AssistantPrincipal.
// A teacher reads their own assignments through getMyAssignments() only.
@Injectable({
  providedIn: 'root',
})
export class TeacherAssignmentsService {

  // Base URL of the TeacherAssignments API.
  private readonly apiUrl =
    `${environment.apiUrl}/teacherassignments`;

  private readonly http = inject(HttpClient);


  // GET /api/teacherassignments?teacherId=&academicTermId=&isActive=
  // Unpaged array.
  getAssignments(
    filters: TeacherAssignmentFilters = {}
  ): Observable<ApiResponse<TeacherAssignment[]>> {

    let params = new HttpParams();

    if (filters.teacherId !== undefined) {
      params = params.set('teacherId', filters.teacherId);
    }

    if (filters.academicTermId !== undefined) {
      params = params.set('academicTermId', filters.academicTermId);
    }

    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive);
    }

    return this.http.get<ApiResponse<TeacherAssignment[]>>(
      this.apiUrl,
      { params }
    );
  }


  // GET /api/teacherassignments/mine (Teacher only)
  // The logged-in teacher's active assignments.
  // Without academicTermId the backend uses the current term.
  getMyAssignments(
    academicTermId?: number
  ): Observable<ApiResponse<TeacherAssignment[]>> {

    let params = new HttpParams();

    if (academicTermId !== undefined) {
      params = params.set('academicTermId', academicTermId);
    }

    return this.http.get<ApiResponse<TeacherAssignment[]>>(
      `${this.apiUrl}/mine`,
      { params }
    );
  }


  // GET /api/teacherassignments/{assignmentId}
  getAssignment(
    assignmentId: number
  ): Observable<ApiResponse<TeacherAssignment>> {

    return this.http.get<ApiResponse<TeacherAssignment>>(
      `${this.apiUrl}/${assignmentId}`
    );
  }


  // POST /api/teacherassignments
  // The backend enrolls the section's students in the subject automatically.
  createAssignment(
    data: CreateTeacherAssignmentRequest
  ): Observable<ApiResponse<TeacherAssignment>> {

    return this.http.post<ApiResponse<TeacherAssignment>>(
      this.apiUrl,
      data
    );
  }


  // PUT /api/teacherassignments/{assignmentId}
  updateAssignment(
    assignmentId: number,
    data: UpdateTeacherAssignmentRequest
  ): Observable<ApiResponse<TeacherAssignment>> {

    return this.http.put<ApiResponse<TeacherAssignment>>(
      `${this.apiUrl}/${assignmentId}`,
      data
    );
  }


  // PATCH /api/teacherassignments/{assignmentId}/status?isActive=true
  // isActive is sent as a query parameter, with an empty body.
  // Deactivating stops the students' enrollments; activating enrolls them again.
  updateAssignmentStatus(
    assignmentId: number,
    isActive: boolean
  ): Observable<ApiResponse<TeacherAssignment>> {

    const params = new HttpParams()
      .set('isActive', isActive);

    return this.http.patch<ApiResponse<TeacherAssignment>>(
      `${this.apiUrl}/${assignmentId}/status`,
      null,
      { params }
    );
  }
}
