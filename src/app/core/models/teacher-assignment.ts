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

  // The subject plan this section follows (term + class + subject),
  // or null when there is no plan yet (API Reference, section 8, 2026-10-16).
  // The passing mark, the components and the lock live on the plan:
  // GET /api/subjectplans/{subjectPlanId}.
  subjectPlanId: number | null;

  isActive: boolean;
}


// Body of POST /api/teacherassignments.
// The subject plan must exist first for the same term, class and subject
// (otherwise 400). The passing mark comes from the plan.
export interface CreateTeacherAssignmentRequest {
  teacherId: number;
  academicTermId: number;
  classId: number;
  sectionId: number;
  subjectId: number;
}


// Body of PUT /api/teacherassignments/{id}.
// Only the teacher can change:
// the term, class, section and subject are fixed after creation.
export interface UpdateTeacherAssignmentRequest {
  teacherId: number;
}


// Optional filters of GET /api/teacherassignments.
// The API has no class or section filter: the page filters by class and section itself.
export interface TeacherAssignmentFilters {
  teacherId?: number;
  academicTermId?: number;
  isActive?: boolean;
}