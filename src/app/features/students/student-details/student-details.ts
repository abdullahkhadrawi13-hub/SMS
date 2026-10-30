import { Student } from '../../../core/models/student';

// Helpers shared by the student page (student-details-page)
// and its "Details" tab (student-info-tab).
// The language of the page is read from <html lang="...">.

function isArabicPage(): boolean {
  return document.documentElement.lang === 'ar';
}

export function getStudentNameAr(student: Student): string {
  return [
    student.firstNameAr,
    student.fatherNameAr,
    student.grandFatherNameAr,
    student.familyNameAr
  ]
    .filter(Boolean)
    .join(' ');
}

export function getStudentNameEn(student: Student): string {
  return [
    student.firstNameEn,
    student.fatherNameEn,
    student.grandFatherNameEn,
    student.familyNameEn
  ]
    .filter(Boolean)
    .join(' ');
}

// The class name comes with the student (classNameAr / classNameEn).
// Falls back to the id if the names are missing.
export function getStudentClassName(student: Student): string {
  const name = isArabicPage()
    ? student.classNameAr || student.classNameEn
    : student.classNameEn || student.classNameAr;

  return name || String(student.classId ?? '-');
}

// The section name comes with the student (sectionAr / sectionEn).
// Falls back to the id if the names are missing.
export function getStudentSectionName(student: Student): string {
  const name = isArabicPage()
    ? student.sectionAr || student.sectionEn
    : student.sectionEn || student.sectionAr;

  return name || String(student.sectionId ?? '-');
}
