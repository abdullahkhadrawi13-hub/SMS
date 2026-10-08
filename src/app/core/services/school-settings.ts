import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';

@Injectable({
  providedIn: 'root',
})
export class SchoolSettingsService {
  private readonly http = inject(HttpClient);

  // Base URL for School Settings API.
  private readonly apiUrl = 'http://localhost:5253/api/schoolsettings';

  // Get the current attendance officer teacher ID.
  // The API returns the teacherId directly in data,
  // or null if no attendance officer has been assigned.
  getAttendanceOfficer(): Observable<ApiResponse<number | null>> {
    return this.http.get<ApiResponse<number | null>>(
      `${this.apiUrl}/attendance-officer`
    );
  }

  // Set or change the attendance officer.
  // The teacherId is sent as a route parameter,
  // and the request has no body.
  setAttendanceOfficer(
    teacherId: number
  ): Observable<ApiResponse<number | null>> {
    return this.http.put<ApiResponse<number | null>>(
      `${this.apiUrl}/attendance-officer/${teacherId}`,
      null
    );
  }
  
}