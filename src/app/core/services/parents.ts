import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response';
import { PagedResult } from '../models/paged-result';
import {
  CreateParentRequest,
  ParentChildRequest,
  ParentDto,
  UpdateParentRequest
} from '../models/parent';
import { environment } from '../../../environments/environment';


// The filters of the parents list (GET /api/parents). All are optional.
export interface ParentsQuery {
  pageNumber?: number;
  pageSize?: number;

  // Name, login ID or phone number.
  search?: string;

  // The account status.
  isActive?: boolean;

  // Only the parents of this student (used by the student details).
  studentId?: number;
}


// Parents API (API Reference, section 14).
// Admin manages parents, the Assistant Principal reads them,
// and a parent reads their own account through getMe().
@Injectable({
  providedIn: 'root',
})
export class ParentsService {

  // Base URL of the Parents API.
  private readonly apiUrl =
    `${environment.apiUrl}/parents`;

  private readonly http = inject(HttpClient);


  // Gets a paged list of parents (each one with their children).
  getParents(
    query: ParentsQuery = {}
  ): Observable<ApiResponse<PagedResult<ParentDto>>> {

    let params = new HttpParams()
      .set('pageNumber', query.pageNumber ?? 1)
      .set('pageSize', query.pageSize ?? 10);

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }

    if (query.isActive !== undefined) {
      params = params.set('isActive', query.isActive);
    }

    if (query.studentId !== undefined) {
      params = params.set('studentId', query.studentId);
    }

    return this.http.get<ApiResponse<PagedResult<ParentDto>>>(
      this.apiUrl,
      { params }
    );
  }


  // Gets one parent by parentId.
  getParent(
    parentId: number
  ): Observable<ApiResponse<ParentDto>> {

    return this.http.get<ApiResponse<ParentDto>>(
      `${this.apiUrl}/${parentId}`
    );
  }


  // The logged-in parent: their account and children (Parent role only).
  getMe(): Observable<ApiResponse<ParentDto>> {

    return this.http.get<ApiResponse<ParentDto>>(
      `${this.apiUrl}/me`
    );
  }


  // Creates the parent account and links the children in the same request.
  // If one child is not accepted, nothing is saved.
  createParent(
    data: CreateParentRequest
  ): Observable<ApiResponse<ParentDto>> {

    return this.http.post<ApiResponse<ParentDto>>(
      this.apiUrl,
      data
    );
  }


  // Edits the parent's names, login ID and phone number.
  updateParent(
    parentId: number,
    data: UpdateParentRequest
  ): Observable<ApiResponse<ParentDto>> {

    return this.http.put<ApiResponse<ParentDto>>(
      `${this.apiUrl}/${parentId}`,
      data
    );
  }


  // Activates or deactivates a parent account.
  // isActive is sent as a query parameter, with an empty body.
  updateParentStatus(
    parentId: number,
    isActive: boolean
  ): Observable<ApiResponse<ParentDto>> {

    const params = new HttpParams()
      .set('isActive', isActive);

    return this.http.patch<ApiResponse<ParentDto>>(
      `${this.apiUrl}/${parentId}/status`,
      null,
      { params }
    );
  }


  // Links a child to the parent. Returns the updated parent.
  linkChild(
    parentId: number,
    data: ParentChildRequest
  ): Observable<ApiResponse<ParentDto>> {

    return this.http.post<ApiResponse<ParentDto>>(
      `${this.apiUrl}/${parentId}/students`,
      data
    );
  }


  // Removes the link only; both accounts stay.
  unlinkChild(
    parentId: number,
    studentId: number
  ): Observable<ApiResponse<ParentDto | null>> {

    return this.http.delete<ApiResponse<ParentDto | null>>(
      `${this.apiUrl}/${parentId}/students/${studentId}`
    );
  }
}
