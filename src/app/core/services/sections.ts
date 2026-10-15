import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import {
  Section,
  SectionSimpleDto,
  ActiveSectionDto,
  CreateSectionRequest,
  UpdateSectionRequest,
  SectionFilters
} from '../models/section';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SectionsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/Sections`;


  // GET /api/Sections
  getSections(
    filters: SectionFilters = {}
  ): Observable<ApiResponse<PagedResult<Section>>> {

    let params = new HttpParams();

    if (filters.academicYearId !== undefined) {
      params = params.set(
        'academicYearId',
        filters.academicYearId
      );
    }

    if (filters.academicTermId !== undefined) {
      params = params.set(
        'academicTermId',
        filters.academicTermId
      );
    }

    if (filters.classId !== undefined) {
      params = params.set(
        'classId',
        filters.classId
      );
    }

    if (filters.sectionId !== undefined) {
      params = params.set(
        'sectionId',
        filters.sectionId
      );
    }

    if (filters.isActive !== undefined) {
      params = params.set(
        'isActive',
        filters.isActive
      );
    }

    params = params.set(
      'pageNumber',
      filters.pageNumber ?? 1
    );

    params = params.set(
      'pageSize',
      filters.pageSize ?? 10
    );

    return this.http.get<ApiResponse<PagedResult<Section>>>(
      this.apiUrl,
      { params }
    );
  }


  // GET /api/Sections/by-class/{classId}
  getSectionsByClass(
    classId: number
  ): Observable<ApiResponse<SectionSimpleDto[]>> {

    return this.http.get<ApiResponse<SectionSimpleDto[]>>(
      `${this.apiUrl}/by-class/${classId}`
    );
  }


  // GET /api/Sections/{sectionId}
  getSection(
    sectionId: number
  ): Observable<ApiResponse<SectionSimpleDto>> {

    return this.http.get<ApiResponse<SectionSimpleDto>>(
      `${this.apiUrl}/${sectionId}`
    );
  }


  // POST /api/Sections
  createSection(
    data: CreateSectionRequest
  ): Observable<ApiResponse<SectionSimpleDto>> {

    return this.http.post<ApiResponse<SectionSimpleDto>>(
      this.apiUrl,
      data
    );
  }


  // PUT /api/Sections/{sectionId}
  updateSection(
    sectionId: number,
    data: UpdateSectionRequest
  ): Observable<ApiResponse<SectionSimpleDto>> {

    return this.http.put<ApiResponse<SectionSimpleDto>>(
      `${this.apiUrl}/${sectionId}`,
      data
    );
  }


  // PATCH /api/Sections/{sectionId}/status
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


  // GET /api/Sections/active-by-class/{classId}
  getActiveSectionsByClass(
    classId: number
  ): Observable<ApiResponse<ActiveSectionDto[]>> {

    return this.http.get<ApiResponse<ActiveSectionDto[]>>(
      `${this.apiUrl}/active-by-class/${classId}`
    );
  }

}
