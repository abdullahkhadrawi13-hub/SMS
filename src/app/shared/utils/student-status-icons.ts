import { StudentStatus } from '../../core/models/student';


// The icon of a message about a student who is not active
// («علامات أبنائي», «حضور أبنائي», the Grades tab of the student page).
// One place, so the grades and attendance messages use the same icons.
//
// Not the same as the app-student-status badge: there "Inactive" is
// "logout" (left the school); here it is "person_off" (no record now).
const STATUS_MESSAGE_ICONS: Record<StudentStatus, string> = {
  [StudentStatus.Active]: 'school',
  [StudentStatus.Inactive]: 'person_off',
  [StudentStatus.Graduated]: 'workspace_premium',
  [StudentStatus.Transferred]: 'swap_horiz',
};

// A message about a student's status: its icon and translation key.
export interface StatusMessage {
  icon: string;
  key: string;
}

export function getStatusMessageIcon(status: StudentStatus): string {
  return STATUS_MESSAGE_ICONS[status] ?? STATUS_MESSAGE_ICONS[StudentStatus.Active];
}
