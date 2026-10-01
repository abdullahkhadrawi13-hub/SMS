export interface ApiResponse<T> {
  success: boolean;
  messageAr: string;
  messageEn: string;
  data: T;
}