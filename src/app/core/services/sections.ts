import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { Section } from '../../features/classes/section';

export interface SectionPagedResult {
  items: Section[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface SectionSimpleDto {
  sectionId: number;
  classId: number;
  sectionAr: string;
  sectionEn: string;
  isActive: boolean;
}

export interface ActiveSectionDto {
  sectionId: number;
  sectionAr: string;
  sectionEn: string;
}

export interface CreateSectionRequest {
  classId: number;
  sectionAr: string;
  sectionEn: string;
}

export interface UpdateSectionRequest {
  sectionAr: string;
  sectionEn: string;
}

export interface SectionFilters {
  academicYearId?: number;
  academicTermId?: number;
  classId?: number;
  sectionId?: number;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SectionsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:5253/api/Sections';

  getSections(
    filters: SectionFilters = {}
  ): Observable<ApiResponse<SectionPagedResult>> {

    let params = new HttpParams();

    if (filters.academicYearId !== undefined) {
      params = params.set('academicYearId', filters.academicYearId);
    }

    if (filters.academicTermId !== undefined) {
      params = params.set('academicTermId', filters.academicTermId);
    }

    if (filters.classId !== undefined) {
      params = params.set('classId', filters.classId);
    }

    if (filters.sectionId !== undefined) {
      params = params.set('sectionId', filters.sectionId);
    }

    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive);
    }

    params = params.set(
      'pageNumber',
      filters.pageNumber ?? 1
    );

    params = params.set(
      'pageSize',
      filters.pageSize ?? 10
    );

    return this.http.get<ApiResponse<SectionPagedResult>>(
      this.apiUrl,
      { params }
    );
  }

  getSectionsByClass(
    classId: number
  ): Observable<ApiResponse<SectionSimpleDto[]>> {

    return this.http.get<ApiResponse<SectionSimpleDto[]>>(
      `${this.apiUrl}/by-class/${classId}`
    );
  }

  getSection(
    sectionId: number
  ): Observable<ApiResponse<SectionSimpleDto>> {

    return this.http.get<ApiResponse<SectionSimpleDto>>(
      `${this.apiUrl}/${sectionId}`
    );
  }

  createSection(
    data: CreateSectionRequest
  ): Observable<ApiResponse<SectionSimpleDto>> {

    return this.http.post<ApiResponse<SectionSimpleDto>>(
      this.apiUrl,
      data
    );
  }

  updateSection(
    sectionId: number,
    data: UpdateSectionRequest
  ): Observable<ApiResponse<SectionSimpleDto>> {

    return this.http.put<ApiResponse<SectionSimpleDto>>(
      `${this.apiUrl}/${sectionId}`,
      data
    );
  }

  updateSectionStatus(
    sectionId: number,
    isActive: boolean
  ): Observable<ApiResponse<SectionSimpleDto>> {

    const params = new HttpParams()
      .set('isActive', isActive);

    return this.http.patch<ApiResponse<SectionSimpleDto>>(
      `${this.apiUrl}/${sectionId}/status`,
      null,
      { params }
    );
  }

  getActiveSectionsByClass(
    classId: number
  ): Observable<ApiResponse<ActiveSectionDto[]>> {

    return this.http.get<ApiResponse<ActiveSectionDto[]>>(
      `${this.apiUrl}/active-by-class/${classId}`
    );
  }
}
