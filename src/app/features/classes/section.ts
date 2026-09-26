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

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}