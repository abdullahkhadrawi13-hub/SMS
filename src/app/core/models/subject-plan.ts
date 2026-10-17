// Subject plans (SMS API Reference, section 9).
//
// One plan per (academic term, class, subject). The administration sets it once,
// and every section of the class follows it:
//   - the components (e.g. Quizzes 20, First exam 20, Final exam 60)
//   - the weight of each component (they add up to 100 before marks can be entered)
//   - the passing mark
//
// Two kinds of components:
//   - fixed (teacherAddsAssessments = false): one assessment in every section,
//     created by the system, out of maxMark (e.g. the final exam out of 60).
//   - open (teacherAddsAssessments = true): the teacher adds as many assessments
//     as they like (quizzes), each out of a max mark they choose. maxMark is null.
//
// The first mark in any section locks the plan for every section.
// Only the Admin can unlock it.


// One component of a plan.
export interface SubjectPlanComponent {
  subjectPlanComponentId: number;

  nameAr: string;
  nameEn: string;

  // Part of the final result (out of 100).
  weight: number;

  // true = open component (the teacher adds assessments).
  // false = fixed component (one assessment per section, out of maxMark).
  teacherAddsAssessments: boolean;

  // Fixed components only (null for open components).
  maxMark: number | null;

  order: number;
}


// One plan (SubjectPlanDto). Every plan endpoint returns this shape.
export interface SubjectPlan {
  subjectPlanId: number;

  academicTermId: number;
  academicTermNameAr: string;
  academicTermNameEn: string;

  classId: number;
  classNameAr: string;
  classNameEn: string;

  subjectId: number;
  subjectAr: string;
  subjectEn: string;

  passingMark: number;

  // true after the first mark in any section (or locked by hand).
  isLocked: boolean;

  // The sum of the components' weights.
  totalWeight: number;

  // true when the weights add up to exactly 100 (marks can be entered).
  isComplete: boolean;

  // Number of sections (teacher assignments) that follow the plan.
  assignmentCount: number;

  // true when at least one mark exists in one of those sections.
  hasGrades: boolean;

  components: SubjectPlanComponent[];
}


// One component in the body of POST /api/subjectplans
// and POST /api/subjectplans/{id}/components.
export interface SubjectPlanComponentRequest {
  nameAr: string;
  nameEn: string;
  weight: number;
  teacherAddsAssessments: boolean;

  // Required for a fixed component, null for an open one.
  maxMark: number | null;

  order: number;
}


// Body of PUT /api/subjectplans/components/{componentId}.
// The type (fixed / open) never changes after creation.
export interface UpdateSubjectPlanComponentRequest {
  nameAr: string;
  nameEn: string;
  weight: number;
  maxMark: number | null;
  order: number;
}


// Body of POST /api/subjectplans.
// components is optional: they can be added later.
export interface CreateSubjectPlanRequest {
  academicTermId: number;
  classId: number;
  subjectId: number;
  passingMark: number;
  components: SubjectPlanComponentRequest[];
}


// Body of PUT /api/subjectplans/{id}.
// The term, class and subject never change.
export interface UpdateSubjectPlanRequest {
  passingMark: number;
}


// Body of POST /api/subjectplans/copy.
export interface CopySubjectPlansRequest {
  fromAcademicTermId: number;
  toAcademicTermId: number;
}


// Response data of POST /api/subjectplans/copy.
// A plan that already exists in the target term, or one for an inactive
// class or subject, is skipped.
export interface CopySubjectPlansResult {
  copiedCount: number;
  skippedCount: number;
}


// Optional filters of GET /api/subjectplans.
export interface SubjectPlanFilters {
  academicTermId?: number;
  classId?: number;
  subjectId?: number;
}
