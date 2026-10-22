import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  BulkGradesRequest,
  BulkGradesResult,
  GradeHistory,
  GradeSheet,
} from '../models/student-grade';
import { environment } from '../../../environments/environment';


// StudentGrades API (SMS API Reference, section 10).
// Reads: Admin, AssistantPrincipal and the teacher who owns the assignment.
// Writes: Admin, or the teacher who owns the assignment
// (AssistantPrincipal gets 403, another teacher gets 400).
@Injectable({
  providedIn: 'root',
})
export class StudentGradesService {

  // Base URL of the StudentGrades API.
  private readonly apiUrl =
    `${environment.apiUrl}/studentgrades`;

  private readonly http = inject(HttpClient);


  // GET /api/studentgrades/sheet?teacherAssignmentId={id}
  // The grade sheet of one section in one call:
  // components, assessments, students, their marks, totals and results.
  getSheet(
    teacherAssignmentId: number
  ): Observable<ApiResponse<GradeSheet>> {

    const params = new HttpParams()
      .set('teacherAssignmentId', teacherAssignmentId);

    return this.http.get<ApiResponse<GradeSheet>>(
      `${this.apiUrl}/sheet`,
      { params }
    );
  }


  // POST /api/studentgrades/bulk
  // Saves many marks of one section in one request (all or nothing).
  // The response holds the new sheet.
  saveBulk(
    request: BulkGradesRequest
  ): Observable<ApiResponse<BulkGradesResult>> {

    return this.http.post<ApiResponse<BulkGradesResult>>(
      `${this.apiUrl}/bulk`,
      request
    );
  }


  // GET /api/studentgrades/{studentGradeId}/history
  // Who entered the mark, the last edit, and every change (newest first).
  getHistory(
    studentGradeId: number
  ): Observable<ApiResponse<GradeHistory>> {

    return this.http.get<ApiResponse<GradeHistory>>(
      `${this.apiUrl}/${studentGradeId}/history`
    );
  }
}
