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
}