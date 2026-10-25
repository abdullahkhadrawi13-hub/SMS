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
import {
  StudentGradesQuery,
  StudentGradesReport,
} from '../models/student-grades-report';
import { environment } from '../../../environments/environment';


// StudentGrades API (SMS API Reference, section 10).
// Reads: Admin, AssistantPrincipal and the teacher who owns the assignment.
// Writes: Admin, or the teacher who owns the assignment
// (AssistantPrincipal gets 403, another teacher gets 400).
//
// One student's grades (read only, see core/models/student-grades-report.ts):
//   - getByStudent(): Admin, AssistantPrincipal, Parent (own children)
//   - getMine():      Student
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


  // GET /api/studentgrades/by-student/{studentId}
  // One student's grades. Without a query: every term, newest first.
  // A parent asking for a student who is not their child gets 400.
  getByStudent(
    studentId: number,
    query: StudentGradesQuery = {}
  ): Observable<ApiResponse<StudentGradesReport>> {

    return this.http.get<ApiResponse<StudentGradesReport>>(
      `${this.apiUrl}/by-student/${studentId}`,
      { params: this.toParams(query) }
    );
  }


  // GET /api/studentgrades/me
  // The logged-in student's own grades (Student role only).
  // 404 when the account has no student record.
  getMine(
    query: StudentGradesQuery = {}
  ): Observable<ApiResponse<StudentGradesReport>> {

    return this.http.get<ApiResponse<StudentGradesReport>>(
      `${this.apiUrl}/me`,
      { params: this.toParams(query) }
    );
  }


  // currentOnly and academicTermId together answer 400,
  // so only one of them is ever sent (currentOnly wins).
  private toParams(query: StudentGradesQuery): HttpParams {

    let params = new HttpParams();

    if (query.currentOnly) {
      params = params.set('currentOnly', true);
    } else if (query.academicTermId !== undefined) {
      params = params.set('academicTermId', query.academicTermId);
    }

    return params;
  }
}
