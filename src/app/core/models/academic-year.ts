// AcademicYear (API Reference, section 7).
// A year has no nameAr / nameEn: its name is yearName (e.g. "2025/2026").
export interface AcademicYear {
  academicYearId: number;
  yearName: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}


// POST /api/academicyears
// isCurrent is not sent: a year becomes current only when one of its
// terms is set as the current term (PATCH /api/academicterms/{id}/current).
export interface CreateAcademicYearRequest {
  yearName: string;
  startDate: string;
  endDate: string;
}


// PUT /api/academicyears/{id} (same body as create).
export interface UpdateAcademicYearRequest {
  yearName: string;
  startDate: string;
  endDate: string;
}
