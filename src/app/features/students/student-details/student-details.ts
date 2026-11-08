import { Student } from '../../../core/models/student';

// Helpers shared by the student page (student-details-page)
// and its "Details" tab (student-info-tab).
//
// Like shared/utils/person-name, every helper receives isArabic
// (the language of the page, from the Language service) instead of
// reading <html lang>, so a computed() that calls it updates as soon as
// the language changes. The names themselves come from person-name
// (getArabicName, getEnglishName, getFullName, getInitials).


// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css.
// The same student keeps the same colour as in the students list.
const AVATAR_TONES = 6;

export function getStudentAvatarTone(student: Student): number {
  return (student.studentId % AVATAR_TONES) + 1;
}


// The class name comes with the student (classNameAr / classNameEn).
// Falls back to the id if the names are missing.
export function getStudentClassName(student: Student, isArabic: boolean): string {
  const name = isArabic
    ? student.classNameAr || student.classNameEn
    : student.classNameEn || student.classNameAr;

  return name || String(student.classId ?? '—');
}

// The section name comes with the student (sectionAr / sectionEn).
// Falls back to the id if the names are missing.
export function getStudentSectionName(student: Student, isArabic: boolean): string {
  const name = isArabic
    ? student.sectionAr || student.sectionEn
    : student.sectionEn || student.sectionAr;

  return name || String(student.sectionId ?? '—');
}
