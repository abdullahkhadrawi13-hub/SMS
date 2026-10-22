import { inject, Injectable } from '@angular/core';

import { Observable, of, tap } from 'rxjs';

import { ApiResponse } from '../../core/models/api-response';
import { GradeHistory } from '../../core/models/student-grade';
import { StudentGradesService } from '../../core/services/student-grades';


// Keeps the history of each mark (by studentGradeId) while one sheet is open,
// so opening the same cell twice does not call the API twice.
//
// Provided by the grades page (not 'root'): every visit to the page starts
// with an empty cache. The page clears it when another sheet is loaded and
// after "Save sheet" (a saved change adds a row to the history).
@Injectable()
export class GradeHistoryCache {

  private readonly gradesService = inject(StudentGradesService);

  private readonly histories = new Map<number, GradeHistory>();


  // GET /api/studentgrades/{studentGradeId}/history (only the first time).
  // Only a successful answer is kept: an error is asked again next time.
  get(studentGradeId: number): Observable<ApiResponse<GradeHistory>> {

    const cached = this.histories.get(studentGradeId);

    if (cached) {
      return of({
        success: true,
        messageAr: '',
        messageEn: '',
        data: cached,
      });
    }

    return this.gradesService.getHistory(studentGradeId).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.histories.set(studentGradeId, response.data);
        }
      })
    );
  }

  clear(): void {
    this.histories.clear();
  }
}
