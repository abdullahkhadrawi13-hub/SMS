import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { SubjectDto, SubjectRequest } from '../models/subject';
import { environment } from '../../../environments/environment';


// Subjects API.
// Reads (list and single subject): Admin and AssistantPrincipal.
// Writes (create, edit, activate / deactivate): Admin only.
@Injectable({
  providedIn: 'root',
})
export class SubjectsService {

  // Base URL of the Subjects API.
  private readonly apiUrl =
    `${environment.apiUrl}/subjects`;

  private readonly http = inject(HttpClient);


  // GET /api/subjects
  // Returns every subject (active and inactive).
  // The API has no search or status filter, so the page filters the list itself.
  getSubjects(): Observable<ApiResponse<SubjectDto[]>> {

    return this.http.get<ApiResponse<SubjectDto[]>>(
      this.apiUrl
    );
  }


  // GET /api/subjects/{subjectId}
  getSubject(
    subjectId: number
  ): Observable<ApiResponse<SubjectDto>> {

    return this.http.get<ApiResponse<SubjectDto>>(
      `${this.apiUrl}/${subjectId}`
    );
  }


  // POST /api/subjects
  createSubject(
    data: SubjectRequest
  ): Observable<ApiResponse<SubjectDto>> {

    return this.http.post<ApiResponse<SubjectDto>>(
      this.apiUrl,
      data
    );
  }


  // PUT /api/subjects/{subjectId}
  updateSubject(
    subjectId: number,
    data: SubjectRequest
  ): Observable<ApiResponse<SubjectDto>> {

    return this.http.put<ApiResponse<SubjectDto>>(
      `${this.apiUrl}/${subjectId}`,
      data
    );
  }


  // PATCH /api/subjects/{subjectId}/status?isActive=true
  // isActive is sent as a query parameter, with an empty body.
  updateSubjectStatus(
    subjectId: number,
    isActive: boolean
  ): Observable<ApiResponse<SubjectDto>> {

    const params = new HttpParams()
      .set('isActive', isActive);

    return this.http.patch<ApiResponse<SubjectDto>>(
      `${this.apiUrl}/${subjectId}/status`,
      null,
      { params }
    );
  }
}
