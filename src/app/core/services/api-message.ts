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

    // Backend errors now use the same camelCase shape as success responses.
    // 401/403 have no body, so fall back to a generic message.

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