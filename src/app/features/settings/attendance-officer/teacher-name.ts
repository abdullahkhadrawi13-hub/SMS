import { TeacherListDto } from '../../../core/services/teachers';

// Returns the full name of a teacher according to the current language.
// Shared by the three attendance officer components,
// so the same code is not repeated in each one.
export function getTeacherName(teacher: TeacherListDto): string {

  return document.documentElement.lang === 'ar'
    ? `${teacher.firstNameAr} ${teacher.fatherNameAr} ${teacher.grandFatherNameAr} ${teacher.familyNameAr}`
    : `${teacher.firstNameEn} ${teacher.fatherNameEn} ${teacher.grandFatherNameEn} ${teacher.familyNameEn}`;
}
