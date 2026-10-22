import { UserRole } from './user-role';


// The student's academic status (the students table, not the account).
// Sent as a number by the API, like every enum.
// It is separate from isActive (the login account): a graduated student
// can have an active or a deactivated account.
export enum StudentStatus {
  Active = 0,
  Inactive = 1,
  Graduated = 2,
  Transferred = 3,
}


export interface Student {
  studentId: number;
  studentNumber: string;

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

  classId: number;
  sectionId: number;

  // Class and section names come with the student itself
  // (list and single student), so no extra requests are needed.
  classNameAr: string;
  classNameEn: string;
  sectionAr: string;
  sectionEn: string;

  // Graduated: classId / sectionId are the class and section the student
  // graduated from, and they cannot be changed (only personal details can).
  studentStatus: StudentStatus;

  role: UserRole;
}


export interface StudentRequest {
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

  classId: number;
  sectionId: number;
}


export interface CreateStudentRequest extends StudentRequest {
  temporaryPassword: string;
}
