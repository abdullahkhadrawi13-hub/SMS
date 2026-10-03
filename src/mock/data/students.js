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

    role: 3
  });
}

module.exports = students;