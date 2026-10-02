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
  const response = error.error as {
    Success: boolean;
    MessageAr: string;
    MessageEn: string;
    Data: null;
  };

  return this.language.getCurrentLanguage() === 'ar'
    ? response.MessageAr
    : response.MessageEn;
}
}