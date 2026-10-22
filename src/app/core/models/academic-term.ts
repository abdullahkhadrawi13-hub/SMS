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

  // The term's grades are closed (approved): nobody can change marks,
  // assessments, subject plans, assignments or placements of this term,
  // not even the Admin, until it is opened again. Reading still works.
  areGradesClosed: boolean;

  // When the grades were closed: UTC without a trailing "Z"
  // (read it with fromApiDateTime). null while the grades are open.
  gradesClosedAt: string | null;

  // true = closed by the year-end rollover: it can never be opened again
  // (the pass and repeat decisions were made from these grades).
  gradesClosedByRollover: boolean;
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
