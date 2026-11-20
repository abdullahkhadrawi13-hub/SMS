import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { ParentDashboardResponse, StudentDashboardCard } from '../models/dashboard';
import { environment } from '../../../environments/environment';


// The home pages of the student and the parent (API Reference, section 15).
// Read only: each dashboard is filled by one request.
@Injectable({
  providedIn: 'root',
})
export class DashboardService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  // GET /api/dashboard/student/me (Student)
  // The logged-in student's card. 404 when the account has no student row.
  getStudentMe(): Observable<ApiResponse<StudentDashboardCard>> {
    return this.http.get<ApiResponse<StudentDashboardCard>>(
      `${this.apiUrl}/student/me`
    );
  }

  // GET /api/dashboard/parent/me (Parent)
  // One card per linked child, active children first.
  // 404 when the account has no parent row.
  getParentMe(): Observable<ApiResponse<ParentDashboardResponse>> {
    return this.http.get<ApiResponse<ParentDashboardResponse>>(
      `${this.apiUrl}/parent/me`
    );
  }
}
