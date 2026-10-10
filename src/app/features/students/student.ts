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

  role: number;
}