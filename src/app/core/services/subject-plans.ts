import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  CopySubjectPlansRequest,
  CopySubjectPlansResult,
  CreateSubjectPlanRequest,
  SubjectPlan,
  SubjectPlanComponentRequest,
  SubjectPlanFilters,
  UpdateSubjectPlanComponentRequest,
  UpdateSubjectPlanRequest,
} from '../models/subject-plan';
import { environment } from '../../../environments/environment';


// SubjectPlans API (SMS API Reference, section 9).
// Reads: Admin, AssistantPrincipal and Teacher.
// Writes (plans, components, lock, copy): Admin only.
@Injectable({
  providedIn: 'root',
})
export class SubjectPlansService {

  // Base URL of the SubjectPlans API.
  private readonly apiUrl =
    `${environment.apiUrl}/subjectplans`;

  private readonly http = inject(HttpClient);


  // =========================
  // Plans
  // =========================

  // GET /api/subjectplans?academicTermId=&classId=&subjectId=
  // Every filter is optional. Unpaged array, sorted by term start date,
  // then class level, then subject name.
  getPlans(
    filters: SubjectPlanFilters = {}
  ): Observable<ApiResponse<SubjectPlan[]>> {

    let params = new HttpParams();

    if (filters.academicTermId !== undefined) {
      params = params.set('academicTermId', filters.academicTermId);
    }

    if (filters.classId !== undefined) {
      params = params.set('classId', filters.classId);
    }

    if (filters.subjectId !== undefined) {
      params = params.set('subjectId', filters.subjectId);
    }

    return this.http.get<ApiResponse<SubjectPlan[]>>(
      this.apiUrl,
      { params }
    );
  }


  // GET /api/subjectplans/{subjectPlanId}
  // 404 when the plan does not exist.
  getPlan(
    subjectPlanId: number
  ): Observable<ApiResponse<SubjectPlan>> {

    return this.http.get<ApiResponse<SubjectPlan>>(
      `${this.apiUrl}/${subjectPlanId}`
    );
  }


  // GET /api/subjectplans/by-assignment/{teacherAssignmentId}
  // The plan a section follows. 404 when there is no plan yet.
  getPlanByAssignment(
    teacherAssignmentId: number
  ): Observable<ApiResponse<SubjectPlan>> {

    return this.http.get<ApiResponse<SubjectPlan>>(
      `${this.apiUrl}/by-assignment/${teacherAssignmentId}`
    );
  }


  // POST /api/subjectplans (201)
  // One plan per term + class + subject.
  createPlan(
    data: CreateSubjectPlanRequest
  ): Observable<ApiResponse<SubjectPlan>> {

    return this.http.post<ApiResponse<SubjectPlan>>(
      this.apiUrl,
      data
    );
  }


  // PUT /api/subjectplans/{subjectPlanId}
  // Changes the passing mark only. 400 while the plan is locked.
  updatePlan(
    subjectPlanId: number,
    data: UpdateSubjectPlanRequest
  ): Observable<ApiResponse<SubjectPlan>> {

    return this.http.put<ApiResponse<SubjectPlan>>(
      `${this.apiUrl}/${subjectPlanId}`,
      data
    );
  }


  // DELETE /api/subjectplans/{subjectPlanId}
  // Only for a plan no section follows yet (assignmentCount = 0).
  deletePlan(
    subjectPlanId: number
  ): Observable<ApiResponse<unknown>> {

    return this.http.delete<ApiResponse<unknown>>(
      `${this.apiUrl}/${subjectPlanId}`
    );
  }


  // PATCH /api/subjectplans/{subjectPlanId}/lock?isLocked=false
  // isLocked is a query parameter, with an empty body.
  // Locking by hand needs the weights to add up to 100.
  setLock(
    subjectPlanId: number,
    isLocked: boolean
  ): Observable<ApiResponse<SubjectPlan>> {

    const params = new HttpParams()
      .set('isLocked', isLocked);

    return this.http.patch<ApiResponse<SubjectPlan>>(
      `${this.apiUrl}/${subjectPlanId}/lock`,
      null,
      { params }
    );
  }


  // POST /api/subjectplans/copy
  // Copies every plan of one term into another (unlocked).
  copyPlans(
    data: CopySubjectPlansRequest
  ): Observable<ApiResponse<CopySubjectPlansResult>> {

    return this.http.post<ApiResponse<CopySubjectPlansResult>>(
      `${this.apiUrl}/copy`,
      data
    );
  }


  // =========================
  // Components
  // =========================

  // POST /api/subjectplans/{subjectPlanId}/components (201)
  // Returns the whole plan. A fixed component gets its assessment
  // in every section of the plan.
  addComponent(
    subjectPlanId: number,
    data: SubjectPlanComponentRequest
  ): Observable<ApiResponse<SubjectPlan>> {

    return this.http.post<ApiResponse<SubjectPlan>>(
      `${this.apiUrl}/${subjectPlanId}/components`,
      data
    );
  }


  // PUT /api/subjectplans/components/{componentId}
  // Returns the whole plan. The type (fixed / open) never changes.
  updateComponent(
    componentId: number,
    data: UpdateSubjectPlanComponentRequest
  ): Observable<ApiResponse<SubjectPlan>> {

    return this.http.put<ApiResponse<SubjectPlan>>(
      `${this.apiUrl}/components/${componentId}`,
      data
    );
  }


  // DELETE /api/subjectplans/components/{componentId}
  // Deletes the component and its assessments in every section,
  // and returns the plan. 400 while locked, or when the component has marks.
  deleteComponent(
    componentId: number
  ): Observable<ApiResponse<SubjectPlan>> {

    return this.http.delete<ApiResponse<SubjectPlan>>(
      `${this.apiUrl}/components/${componentId}`
    );
  }
}
