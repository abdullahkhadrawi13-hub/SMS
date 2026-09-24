import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { Section } from '../../features/classes/section';

@Injectable({
  providedIn: 'root'
})
export class Sections {

  private http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:5253/api/Sections';

  getSectionsByClass(classId: number): Observable<ApiResponse<Section[]>> {
    return this.http.get<ApiResponse<Section[]>>(
      `${this.apiUrl}/by-class/${classId}`
    );
  }

  getActiveSectionsByClass(classId: number): Observable<ApiResponse<Section[]>> {
    return this.http.get<ApiResponse<Section[]>>(
      `${this.apiUrl}/active-by-class/${classId}`
    );
  }

  getSection(sectionId: number): Observable<ApiResponse<Section>> {
    return this.http.get<ApiResponse<Section>>(
      `${this.apiUrl}/${sectionId}`
    );
  }

  createSection(data: {
    classId: number;
    sectionAr: string;
    sectionEn: string;
  }): Observable<ApiResponse<Section>> {
    return this.http.post<ApiResponse<Section>>(
      this.apiUrl,
      data
    );
  }

  updateSection(
    sectionId: number,
    data: {
      sectionAr: string;
      sectionEn: string;
    }
  ): Observable<ApiResponse<Section>> {
    return this.http.put<ApiResponse<Section>>(
      `${this.apiUrl}/${sectionId}`,
      data
    );
  }

  updateSectionStatus(
    sectionId: number,
    isActive: boolean
  ): Observable<ApiResponse<Section>> {
    return this.http.patch<ApiResponse<Section>>(
      `${this.apiUrl}/${sectionId}/status?isActive=${isActive}`,
      {}
    );
  }
}