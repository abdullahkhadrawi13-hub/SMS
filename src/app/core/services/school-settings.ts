import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import {
  PromotionSettings,
  SaveSchoolInfoRequest,
  SchoolInfo,
} from '../models/school-settings';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SchoolSettingsService {
  private readonly http = inject(HttpClient);

  // Base URL for School Settings API.
  private readonly apiUrl = `${environment.apiUrl}/schoolsettings`;

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

  // GET /api/schoolsettings/school (any signed-in user)
  // The school's names, phone, address and weekly days off.
  getSchoolInfo(): Observable<ApiResponse<SchoolInfo>> {
    return this.http.get<ApiResponse<SchoolInfo>>(
      `${this.apiUrl}/school`
    );
  }

  // PUT /api/schoolsettings/school (Admin)
  // Saves the school information: every field is sent each time.
  // Returns the saved information (same shape as GET).
  updateSchoolInfo(
    body: SaveSchoolInfoRequest
  ): Observable<ApiResponse<SchoolInfo>> {
    return this.http.put<ApiResponse<SchoolInfo>>(
      `${this.apiUrl}/school`,
      body
    );
  }


  // Change the rollover setting: how many failed subjects (or more)
  // make the rollover preview suggest "Repeat" (between 1 and 50).
  // The current value comes with the rollover preview
  // (failedSubjectsToRepeat), so there is no separate GET here.
  updatePromotion(
    failedSubjectsToRepeat: number
  ): Observable<ApiResponse<PromotionSettings>> {
    return this.http.put<ApiResponse<PromotionSettings>>(
      `${this.apiUrl}/promotion`,
      { failedSubjectsToRepeat } satisfies PromotionSettings
    );
  }

}