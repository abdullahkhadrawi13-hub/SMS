import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';


// One teacher assignment (TeacherAssignmentDto, SMS API Reference, section 8).
// An assignment = a subject taught in one section of a class, in one term, by one teacher.
// In the Subjects page each assignment is shown as "a subject of the section".
//
// Note: there is no teacher name here, only teacherId and teacherNumber.
// The name comes from the teachers list (GET /api/teachers).
export interface TeacherAssignment {
  teacherAssignmentId: number;

  teacherId: number;
  teacherNumber: string;

  academicTermId: number;
  academicTermNameAr: string;
  academicTermNameEn: string;

  classId: number;
  classNameAr: string;
  classNameEn: string;

  sectionId: number;
  sectionAr: string;
  sectionEn: string;

  subjectId: number;
  subjectAr: string;
  subjectEn: string;

  passingMark: number;

  // true = the assessment structure is final and grades can be entered.
  isAssessmentStructureLocked: boolean;

  isActive: boolean;
}


// Body of POST /api/teacherassignments.
export interface CreateTeacherAssignmentRequest {
  teacherId: number;
  academicTermId: number;
  classId: number;
  sectionId: number;
  subjectId: number;
  passingMark: number;
}


// Body of PUT /api/teacherassignments/{id}.
// Only the teacher and the passing mark can change:
// the term, class, section and subject are fixed after creation.
export interface UpdateTeacherAssignmentRequest {
  teacherId: number;
  passingMark: number;
}


// Optional filters of GET /api/teacherassignments.
// The API has no class or section filter: the page filters by class and section itself.
export interface TeacherAssignmentFilters {
  teacherId?: number;
  academicTermId?: number;
  isActive?: boolean;
}


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
    'http://localhost:5253/api/teacherassignments';

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
