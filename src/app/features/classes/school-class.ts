export interface SchoolClass {
  schoolClassId: number;
  classNameAr: string;
  classNameEn: string;
  level: number;
  isGraduationGrade: boolean;
  isActive: boolean;
}

export interface SchoolClassSimpleDto {
  schoolClassId: number;
  classNameAr: string;
  classNameEn: string;
}

export interface CreateSchoolClassRequest {
  classNameAr: string;
  classNameEn: string;
  level: number;
  isGraduationGrade: boolean;
}

export interface UpdateSchoolClassRequest {
  classNameAr: string;
  classNameEn: string;
  level: number;
  isGraduationGrade: boolean;
}