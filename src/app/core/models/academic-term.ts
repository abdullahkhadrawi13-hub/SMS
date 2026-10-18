// AcademicTerm (API Reference, section 7).
// isActive : the term is usable in the system.
// isCurrent: the term the school is using now (only one term at a time).
export interface AcademicTerm {
  academicTermId: number;
  academicYearId: number;
  termNumber: number;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isCurrent: boolean;
}


// POST /api/academicterms
// academicYearId is sent only on create: a term never moves to another year.
export interface CreateAcademicTermRequest {
  academicYearId: number;
  termNumber: number;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}


// PUT /api/academicterms/{id}
// Also used to activate / deactivate a term: there is no separate
// status endpoint, so the same body is sent with only isActive changed.
export interface UpdateAcademicTermRequest {
  termNumber: number;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
