import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Section } from '../../features/classes/section';

export interface SectionPagedResult {
  items: Section[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface SectionsResponse {
  success: boolean;
  messageAr: string;
  messageEn: string;
  data: SectionPagedResult;
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

  getSections(filters: SectionFilters = {}): Observable<SectionsResponse> {

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

    return this.http.get<SectionsResponse>(
      this.apiUrl,
      { params }
    );
  }
}