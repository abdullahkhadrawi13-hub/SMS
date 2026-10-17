// Assessments (SMS API Reference, section 9).
//
// Every assessment belongs to one teacher assignment (a subject in one section)
// and to one component of the subject plan. The weight lives on the component,
// not on the assessment.
//
// Two kinds:
//   - fixed (isFixed = true): created by the system from a fixed component
//     of the plan (e.g. the final exam). The teacher cannot edit or delete it.
//   - teacher-added (isFixed = false): added by the teacher under an open
//     component (e.g. quizzes), each out of a max mark they choose.


// One assessment (AssessmentDto). Every assessment endpoint returns this shape.
export interface Assessment {
  assessmentId: number;

  teacherAssignmentId: number;

  teacherId: number;
  teacherNumber: string;

  academicTermId: number;
  academicTermNameAr: string;
  academicTermNameEn: string;

  subjectAr: string;
  subjectEn: string;

  classNameAr: string;
  classNameEn: string;

  sectionAr: string;
  sectionEn: string;

  // The plan component this assessment belongs to.
  subjectPlanComponentId: number;
  componentNameAr: string;
  componentNameEn: string;

  // true = created by the system from a fixed component (read-only for the teacher).
  isFixed: boolean;

  nameAr: string;
  nameEn: string;

  // Above 0, up to 999.99. Cannot change once the assessment has marks.
  maxMark: number;

  order: number;
}


// Body of POST /api/assessments.
// Only under an open component of the assignment's subject plan.
export interface CreateAssessmentRequest {
  teacherAssignmentId: number;
  subjectPlanComponentId: number;
  nameAr: string;
  nameEn: string;
  maxMark: number;
  order: number;
}


// Body of PUT /api/assessments/{assessmentId}.
// Teacher-added assessments only. The component never changes.
export interface UpdateAssessmentRequest {
  nameAr: string;
  nameEn: string;
  maxMark: number;
  order: number;
}
