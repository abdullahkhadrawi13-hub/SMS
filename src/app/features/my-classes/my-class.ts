import { SubjectPlan } from '../../core/models/subject-plan';
import { TeacherAssignment } from '../../core/models/teacher-assignment';


// The state of a subject's plan, as the teacher sees it.
// The same words and colours as the Admin's plan badge
// (locked / ready / incomplete), plus 'none' when there is no plan yet.
export type MyPlanStatus = 'locked' | 'ready' | 'incomplete' | 'none';


// One subject the teacher teaches in a section (one line inside a card).
// It is one teacher assignment, with the subject name already in the current language.
export interface MyClassSubject {
  assignment: TeacherAssignment;
  subjectName: string;

  // The subject plan the section follows (passing mark and lock),
  // or null when the administration has not made the plan yet.
  plan: SubjectPlan | null;
}


// One card of "My classes": a class + a section, and the subjects
// the teacher teaches there in the current term.
// Built in the page from GET /api/teacherassignments/mine.
export interface MyClassGroup {
  classId: number;
  sectionId: number;

  className: string;
  sectionName: string;

  subjects: MyClassSubject[];
}


// The numbers above the cards.
export interface MyClassesStats {
  sectionsCount: number;

  // How many different classes those sections are in (the line under "Sections").
  classesCount: number;

  subjectsCount: number;
  lockedCount: number;
  totalAssignments: number;
}
