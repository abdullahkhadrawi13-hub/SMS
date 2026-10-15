// One subject returned by the API (SMS API Reference, section 6).
// Note: the name fields are subjectAr / subjectEn (not nameAr / nameEn).
export interface SubjectDto {
  subjectId: number;
  subjectAr: string;
  subjectEn: string;
  isActive: boolean;
}


// Body of POST /api/subjects and PUT /api/subjects/{id}.
export interface SubjectRequest {
  subjectAr: string;
  subjectEn: string;
}
