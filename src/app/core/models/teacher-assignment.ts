// One teacher assignment (TeacherAssignmentDto, SMS API Reference, section 8).
// An assignment = a subject taught in one section of a class, in one term, by one teacher.
// In the Subjects page each assignment is shown as "a subject of the section".
//
// The teacher's name and account status come with the assignment
// (added 2026-10-16), so there is no need to call GET /api/teachers for them.
export interface TeacherAssignment {
  teacherAssignmentId: number;

  teacherId: number;
  teacherNumber: string;

  // The teacher's four-part name (each part trimmed by the backend).
  teacherNameAr: string;
  teacherNameEn: string;

  // The teacher's account status (false = the admin should pick another teacher).
  isTeacherActive: boolean;

  academicTermId: number;
  academicTermNameAr: string;
  academicTermNameEn: string;

  classId: number;
  classNameAr: string;
  classNameEn: string;

  sectionId: number;
  sectionAr: string;
  sectionEn: string;

  subjectId: number;
  subjectAr: string;
  subjectEn: string;

  passingMark: number;

  // true = the assessment structure is final and grades can be entered.
  isAssessmentStructureLocked: boolean;

  isActive: boolean;
}


// Body of POST /api/teacherassignments.
export interface CreateTeacherAssignmentRequest {
  teacherId: number;
  academicTermId: number;
  classId: number;
  sectionId: number;
  subjectId: number;
  passingMark: number;
}


// Body of PUT /api/teacherassignments/{id}.
// Only the teacher and the passing mark can change:
// the term, class, section and subject are fixed after creation.
export interface UpdateTeacherAssignmentRequest {
  teacherId: number;
  passingMark: number;
}


// Optional filters of GET /api/teacherassignments.
// The API has no class or section filter: the page filters by class and section itself.
export interface TeacherAssignmentFilters {
  teacherId?: number;
  academicTermId?: number;
  isActive?: boolean;
}