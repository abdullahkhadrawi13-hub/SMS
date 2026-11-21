import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  AttendanceAbsentees,
  AttendanceAccess,
  AttendanceDailySummary,
  AttendanceEntry,
  AttendanceRecord,
  AttendanceSheet,
  AttendanceStatus,
  RecordAttendanceRequest,
  StudentAttendanceSummary,
  UpdateAttendanceRequest
} from '../models/attendance';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/attendance`;


  // GET /api/attendance/my-access   (Admin, AssistantPrincipal, Teacher)
  // Tells whether the current user can record attendance and for which dates.
  // Do not call it directly from a component:
  // AttendanceAccessService calls it and keeps the answer for the whole app.
  getMyAccess(): Observable<ApiResponse<AttendanceAccess>> {

    return this.http.get<ApiResponse<AttendanceAccess>>(
      `${this.apiUrl}/my-access`
    );
  }


  // GET /api/attendance/sheet?date=YYYY-MM-DD&classId=..&sectionId=..
  // (Admin, AssistantPrincipal, the attendance officer)
  // The students of one section and each one's status on that day.
  getSheet(
    date: string,
    classId: number,
    sectionId: number
  ): Observable<ApiResponse<AttendanceSheet>> {

    const params = new HttpParams()
      .set('date', date)
      .set('classId', classId)
      .set('sectionId', sectionId);

    return this.http.get<ApiResponse<AttendanceSheet>>(
      `${this.apiUrl}/sheet`,
      { params }
    );
  }


  // POST /api/attendance
  // (Admin, AssistantPrincipal, the attendance officer for today only)
  // Records a batch of students for the same day in one call.
  // All or nothing: if one student is rejected, the whole batch fails.
  // academicTermId is worked out by the backend from the date.
  // data = the records that were created.
  recordAttendance(
    date: string,
    entries: AttendanceEntry[]
  ): Observable<ApiResponse<AttendanceRecord[]>> {

    const request: RecordAttendanceRequest = {
      date,
      entries
    };

    return this.http.post<ApiResponse<AttendanceRecord[]>>(
      this.apiUrl,
      request
    );
  }


  // PUT /api/attendance/{attendanceId}
  // (Admin, AssistantPrincipal; the attendance officer for today's records only)
  // Changes the status of a student that is already recorded.
  updateAttendance(
    attendanceId: number,
    status: AttendanceStatus
  ): Observable<ApiResponse<unknown>> {

    const request: UpdateAttendanceRequest = {
      status
    };

    return this.http.put<ApiResponse<unknown>>(
      `${this.apiUrl}/${attendanceId}`,
      request
    );
  }


  // GET /api/attendance/by-student/{studentId}
  // (Admin, AssistantPrincipal; Parent for their own children)
  // One student's attendance history, in every academic term,
  // sorted oldest to newest. Only recorded days are returned:
  // a day with no record does NOT mean the student was present.
  // 404 for Admin / AssistantPrincipal when the student does not exist;
  // 403 for a parent on a student that is not theirs (or does not exist).
  getStudentAttendance(
    studentId: number
  ): Observable<ApiResponse<AttendanceRecord[]>> {

    return this.http.get<ApiResponse<AttendanceRecord[]>>(
      `${this.apiUrl}/by-student/${studentId}`
    );
  }


  // GET /api/attendance/me   (Student)
  // The logged-in student's own records: the same list and order
  // as by-student. 404 when the account has no student row.
  getMyAttendance(): Observable<ApiResponse<AttendanceRecord[]>> {

    return this.http.get<ApiResponse<AttendanceRecord[]>>(
      `${this.apiUrl}/me`
    );
  }


  // GET /api/attendance/summary/by-student/{studentId}
  // (Admin, AssistantPrincipal; Parent for their own children)
  // Present / absent counts per term, newest term first.
  // Every term: no academicTermId is sent (the pages show one term at a
  // time from this list).
  getStudentSummary(
    studentId: number
  ): Observable<ApiResponse<StudentAttendanceSummary>> {

    return this.http.get<ApiResponse<StudentAttendanceSummary>>(
      `${this.apiUrl}/summary/by-student/${studentId}`
    );
  }


  // GET /api/attendance/summary/me   (Student)
  // The same counts for the logged-in student.
  getMySummary(): Observable<ApiResponse<StudentAttendanceSummary>> {

    return this.http.get<ApiResponse<StudentAttendanceSummary>>(
      `${this.apiUrl}/summary/me`
    );
  }


  // GET /api/attendance/by-date/{date}   (Admin, AssistantPrincipal)
  // Every student's attendance record on one day (date = YYYY-MM-DD).
  // (Not used by a screen yet. The recording screen uses getSheet()
  // and the daily follow-up uses getDailySummary().)
  getAttendanceByDate(
    date: string
  ): Observable<ApiResponse<AttendanceRecord[]>> {

    return this.http.get<ApiResponse<AttendanceRecord[]>>(
      `${this.apiUrl}/by-date/${date}`
    );
  }


  // GET /api/attendance/daily-summary?date=YYYY-MM-DD
  // (Admin, AssistantPrincipal)
  // Which sections have attendance recorded on one day,
  // and how many students are absent in each.
  // date is optional: without it, the backend uses today.
  getDailySummary(
    date?: string
  ): Observable<ApiResponse<AttendanceDailySummary>> {

    let params = new HttpParams();

    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<ApiResponse<AttendanceDailySummary>>(
      `${this.apiUrl}/daily-summary`,
      { params }
    );
  }


  // GET /api/attendance/absentees?date=YYYY-MM-DD
  // (Admin, AssistantPrincipal: any day up to today;
  //  the attendance officer: today only)
  // The students marked absent on one day, with their parents' phone numbers.
  // date is optional: without it, the backend uses today.
  // There is no search or class / section filter in the API:
  // the screen filters the returned list itself.
  getAbsentees(
    date?: string
  ): Observable<ApiResponse<AttendanceAbsentees>> {

    let params = new HttpParams();

    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<ApiResponse<AttendanceAbsentees>>(
      `${this.apiUrl}/absentees`,
      { params }
    );
  }

}
