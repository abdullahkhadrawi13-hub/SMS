export interface LoginResponse {
  userId: number;

  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  loginId: string;

  mustChangePassword: boolean;
  isActive: boolean;

  role: number;

  phoneNumber: string;

  token: string;
}