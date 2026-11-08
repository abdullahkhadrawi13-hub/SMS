import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiResponse } from '../models/api-response';
import { Language } from './language';

@Injectable({
  providedIn: 'root'
})
export class ApiMessageService {

  private readonly language = inject(Language);

  getMessage<T>(response: ApiResponse<T>): string {
    return this.language.getCurrentLanguage() === 'ar'
      ? response.messageAr
      : response.messageEn;
  }

  getErrorMessage(error: HttpErrorResponse): string {

    // Backend errors use the same camelCase shape as success responses,
    // 401 and 403 included (since 2026-10-16 they have a message too).
    // No body (network down, server not running): a generic message.

    const response =
      error.error as Partial<ApiResponse<unknown>> | null;

    const isArabic =
      this.language.getCurrentLanguage() === 'ar';

    const message =
      isArabic
        ? response?.messageAr
        : response?.messageEn;

    return message ?? (
      isArabic
        ? 'حدث خطأ غير متوقع.'
        : 'An unexpected error occurred.'
    );
  }

  // false for 403: the user is logged in but not allowed to do this
  // to this record (another teacher's grade sheet, a student they do
  // not teach, someone else's child...). Sending the same request again
  // gives the same answer, so the error card shows no "Retry" button.
  // Every other error (network down, 500...) can be retried.
  //
  // 400 = the data is wrong, 401 = the session ended (auth-interceptor),
  // 403 = not allowed on this record, 404 = the record does not exist.
  canRetry(error: HttpErrorResponse): boolean {
    return error.status !== 403;
  }
}