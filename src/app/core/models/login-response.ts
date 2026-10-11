import { UserRole } from './user-role';

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

  // The role of the user (Admin, AssistantPrincipal, Teacher, Student, Parent).
  role: UserRole;

  phoneNumber: string;

  token: string;
}