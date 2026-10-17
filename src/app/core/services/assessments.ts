import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  Assessment,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
} from '../models/assessment';
import { environment } from '../../../environments/environment';


// Assessments API (SMS API Reference, section 9).
// Reads: Admin, AssistantPrincipal (read-only) and the teacher who owns the assignment.
// Writes: Admin, or the teacher who owns the assignment
// (teacher-added assessments under open components only).
@Injectable({
  providedIn: 'root',
})
export class AssessmentsService {

  // Base URL of the Assessments API.
  private readonly apiUrl =
    `${environment.apiUrl}/assessments`;

  private readonly http = inject(HttpClient);


  // GET /api/assessments/by-assignment/{teacherAssignmentId}
  // Every assessment of the section (fixed and teacher-added),
  // sorted by component, then order.
  getAssessmentsByAssignment(
    teacherAssignmentId: number
  ): Observable<ApiResponse<Assessment[]>> {

    return this.http.get<ApiResponse<Assessment[]>>(
      `${this.apiUrl}/by-assignment/${teacherAssignmentId}`
    );
  }


  // GET /api/assessments/{assessmentId}
  // One assessment, or 404.
  getAssessment(
    assessmentId: number
  ): Observable<ApiResponse<Assessment>> {

    return this.http.get<ApiResponse<Assessment>>(
      `${this.apiUrl}/${assessmentId}`
    );
  }


  // POST /api/assessments (201)
  // Under an open component only. 400 if the assignment is inactive,
  // there is no plan, or the component is fixed or not in this subject's plan.
  createAssessment(
    request: CreateAssessmentRequest
  ): Observable<ApiResponse<Assessment>> {

    return this.http.post<ApiResponse<Assessment>>(
      this.apiUrl,
      request
    );
  }


  // PUT /api/assessments/{assessmentId}
  // Teacher-added assessments only.
  // maxMark cannot change once the assessment has marks (400).
  updateAssessment(
    assessmentId: number,
    request: UpdateAssessmentRequest
  ): Observable<ApiResponse<Assessment>> {

    return this.http.put<ApiResponse<Assessment>>(
      `${this.apiUrl}/${assessmentId}`,
      request
    );
  }


  // DELETE /api/assessments/{assessmentId}
  // Teacher-added assessments only, and only without marks (400 otherwise).
  deleteAssessment(
    assessmentId: number
  ): Observable<ApiResponse<unknown>> {

    return this.http.delete<ApiResponse<unknown>>(
      `${this.apiUrl}/${assessmentId}`
    );
  }
}
