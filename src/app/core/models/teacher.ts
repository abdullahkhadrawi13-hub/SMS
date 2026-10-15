import { UserRole } from './user-role';

// Represents one teacher returned by the API.
export interface TeacherListDto {
  teacherId: number;
  teacherNumber: string;
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
  phoneNumber: string;

  isActive: boolean;
  mustChangePassword: boolean;
  role: UserRole;
}


// Data required when creating a teacher.
export interface CreateTeacherRequest {
  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  loginId: string;
  temporaryPassword: string;
  phoneNumber: string;
}


// Data required when editing a teacher (UpdateUserDto).
// Same fields as creation, without the password. Every field is required.
export interface UpdateTeacherRequest {
  firstNameAr: string;
  fatherNameAr: string;
  grandFatherNameAr: string;
  familyNameAr: string;

  firstNameEn: string;
  fatherNameEn: string;
  grandFatherNameEn: string;
  familyNameEn: string;

  loginId: string;
  phoneNumber: string;
}
