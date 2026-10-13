import { TeacherAssignment } from '../../core/services/teacher-assignments';


// One subject the teacher teaches in a section (one line inside a card).
// It is one teacher assignment, with the subject name already in the current language.
export interface MyClassSubject {
  assignment: TeacherAssignment;
  subjectName: string;
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


// The numbers shown above the cards.
export interface MyClassesStats {
  sectionsCount: number;
  subjectsCount: number;
  lockedCount: number;
  totalAssignments: number;
}
