const students = [
  {
    studentId: 1,
    studentNumber: 'STU001',

    userId: 10,

    firstNameAr: 'محمد',
    fatherNameAr: 'أحمد',
    grandFatherNameAr: 'علي',
    familyNameAr: 'حسن',

    firstNameEn: 'Mohammad',
    fatherNameEn: 'Ahmad',
    grandFatherNameEn: 'Ali',
    familyNameEn: 'Hassan',

    loginId: 'student001',
    phoneNumber: '0791111111',

    isActive: false,
    mustChangePassword: true,

    classId: 1,
    sectionId: 1,

    // 0 Active, 1 Inactive, 2 Graduated, 3 Transferred (separate from isActive).
    studentStatus: 0,

    role: 3
  }
];

const classSections = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
  5: [13, 14],
  6: [15, 16]
};

for (let i = 2; i <= 73; i++) {
  const classId = ((i - 2) % 6) + 1;

  const sections = classSections[classId];
  const sectionId = sections[(Math.floor((i - 2) / 6)) % sections.length];

  students.push({
    studentId: i,
    studentNumber: `STU${String(i).padStart(3, '0')}`,

    userId: 10 + i,

    firstNameAr: 'طالب',
    fatherNameAr: 'أحمد',
    grandFatherNameAr: 'محمد',
    familyNameAr: `رقم ${i}`,

    firstNameEn: 'Student',
    fatherNameEn: 'Ahmad',
    grandFatherNameEn: 'Mohammad',
    familyNameEn: `${i}`,

    loginId: `student${String(i).padStart(3, '0')}`,
    phoneNumber: `079111${String(i).padStart(4, '0')}`,

    isActive: true,
    mustChangePassword: false,

    classId,
    sectionId,

    studentStatus: 0,

    role: 3
  });
}


// Graduated students (API Reference, section 4, studentStatus = 2).
// Both were in the Sixth Grade (the graduation class). Their class and
// section are the ones they graduated from and cannot be changed.
// Things to try (Students page):
// - Student 7: graduated, account still active.
// - Student 13: graduated, account deactivated.
// The edit form shows the class and section read-only, and a PUT that
// changes them answers 400 (only the personal details can change).
const GRADUATED_STUDENTS = [7, 13];

for (const student of students) {
  if (GRADUATED_STUDENTS.includes(student.studentId)) {
    student.studentStatus = 2;
  }
}

students.find(s => s.studentId === 13).isActive = false;

module.exports = students;