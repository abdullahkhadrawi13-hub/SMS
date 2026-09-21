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

  role: number;
}