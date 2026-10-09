import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  AttendanceAccess,
  AttendanceDailySummary,
  AttendanceEntry,
  AttendanceSheet,
  AttendanceStatus,
  RecordAttendanceRequest,
  UpdateAttendanceRequest
} from '../../features/attendance/attendance';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:5253/api/attendance';


  // GET /api/attendance/my-access
  // Tells whether the current user can record attendance and for which dates.
  // (Not used yet. Needed later when the page is customized for each role.)
  getMyAccess(): Observable<ApiResponse<AttendanceAccess>> {

    return this.http.get<ApiResponse<AttendanceAccess>>(
      `${this.apiUrl}/my-access`
    );
  }


  // GET /api/attendance/sheet?date=YYYY-MM-DD&classId=..&sectionId=..
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
  // Records a batch of students for the same day in one call.
  // All or nothing: if one student is rejected, the whole batch fails.
  // academicTermId is worked out by the backend from the date.
  recordAttendance(
    date: string,
    entries: AttendanceEntry[]
  ): Observable<ApiResponse<unknown>> {

    const request: RecordAttendanceRequest = {
      date,
      entries
    };

    return this.http.post<ApiResponse<unknown>>(
      this.apiUrl,
      request
    );
  }


  // PUT /api/attendance/{attendanceId}
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


  // GET /api/attendance/daily-summary?date=YYYY-MM-DD
  // Which sections have attendance recorded on one day,
  // and how many students are absent in each.
  getDailySummary(
    date: string
  ): Observable<ApiResponse<AttendanceDailySummary>> {

    const params = new HttpParams()
      .set('date', date);

    return this.http.get<ApiResponse<AttendanceDailySummary>>(
      `${this.apiUrl}/daily-summary`,
      { params }
    );
  }

}
