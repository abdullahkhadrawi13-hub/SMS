import { TeacherListDto } from '../../../core/models/teacher';
import { getFullName, getInitials } from '../../../shared/utils/person-name';

// What the attendance officer components show for one teacher:
// the full name and the avatar in the language of the page.
// Shared by the current officer card and the teachers list,
// so the same code is not repeated in each one.
export interface OfficerTeacherView {
  teacher: TeacherListDto;

  // Full four-part name: "محمد يوسف حسن العمري".
  name: string;

  // The round avatar: "مع" + one of the 6 avatar colours.
  initials: string;
  avatarTone: number;
}

// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css.
const AVATAR_TONES = 6;

// isArabic comes from the Language service, so a computed() that calls
// this function updates as soon as the language changes.
export function toOfficerTeacherView(
  teacher: TeacherListDto,
  isArabic: boolean
): OfficerTeacherView {

  return {
    teacher,
    name: getFullName(teacher, isArabic),
    initials: getInitials(teacher, isArabic),

    // The same colour as in the teachers table.
    avatarTone: (teacher.teacherId % AVATAR_TONES) + 1
  };
}
