import { Assessment } from '../../../core/models/assessment';
import { SubjectPlanComponent } from '../../../core/models/subject-plan';


// =========================
// UI types of the teacher's assessments page
// (/my-classes/:teacherAssignmentId/assessments)
// =========================


// One component of the subject plan with the assessments under it.
// One card per group on the page, in the components' order.
export interface ComponentGroup {
  component: SubjectPlanComponent;

  // Name in the current language.
  componentName: string;

  // The section's assessments under this component, sorted by order.
  assessments: Assessment[];
}


// Data passed to the add / edit assessment dialog.
export interface AssessmentFormData {
  mode: 'add' | 'edit';

  teacherAssignmentId: number;

  // The open component the assessment belongs to.
  component: SubjectPlanComponent;
  componentName: string;

  // Edit mode only.
  assessment?: Assessment;

  // Called on a 409 (someone saved at the same moment): the page loads its
  // list again behind the dialog, which stays open with what was typed.
  reloadList: () => void;
}
