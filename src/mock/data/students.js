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

for (let i = 2; i <= 73; i++) {
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

    classId: (i % 3) + 1,
    sectionId: (i % 2) + 1,

    role: 3
  });
}

module.exports = students;