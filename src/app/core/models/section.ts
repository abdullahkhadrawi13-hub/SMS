export interface Section {
  sectionId: number;
  classId: number;

  classNameAr: string;
  classNameEn: string;

  sectionAr: string;
  sectionEn: string;

  studentCount: number;
  isActive: boolean;
}


export interface SectionSimpleDto {
  sectionId: number;
  classId: number;
  sectionAr: string;
  sectionEn: string;
  isActive: boolean;
}


export interface ActiveSectionDto {
  sectionId: number;
  sectionAr: string;
  sectionEn: string;
}


export interface CreateSectionRequest {
  classId: number;
  sectionAr: string;
  sectionEn: string;
}


export interface UpdateSectionRequest {
  sectionAr: string;
  sectionEn: string;
}


export interface SectionFilters {
  academicYearId?: number;
  academicTermId?: number;
  classId?: number;
  sectionId?: number;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}
