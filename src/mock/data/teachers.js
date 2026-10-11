// =====================================================
// Teachers (kept in memory only)
// =====================================================
//
// Every change made through the mock API (add, edit,
// activate / deactivate) is lost when the mock server
// is restarted.
//
// Shape of one teacher (TeacherListDto in the API reference):
// {
//   teacherId: 2,
//   teacherNumber: 'T-0002',     // generated automatically
//   userId: 102,
//   firstNameAr, fatherNameAr, grandFatherNameAr, familyNameAr,
//   firstNameEn, fatherNameEn, grandFatherNameEn, familyNameEn,
//   loginId: 'teacher002',
//   phoneNumber: '0790000002',
//   isActive: true,
//   mustChangePassword: true,
//   role: 2                      // 2 = Teacher
// }

const users = require('./users');

// One row per teacher:
// [ Arabic name (4 parts), English name (4 parts), isActive, mustChangePassword ]
const rows = [
  ['محمد', 'يوسف', 'حسن', 'العمري', 'Mohammad', 'Yousef', 'Hasan', 'Al-Omari', true, false],
  ['أحمد', 'خالد', 'محمود', 'الزعبي', 'Ahmad', 'Khaled', 'Mahmoud', 'Al-Zoubi', true, true],
  ['سارة', 'علي', 'إبراهيم', 'الخطيب', 'Sara', 'Ali', 'Ibrahim', 'Al-Khatib', true, false],
  ['ليلى', 'عمر', 'سعيد', 'حداد', 'Layla', 'Omar', 'Saeed', 'Haddad', false, false],
  ['خالد', 'سليم', 'أحمد', 'النجار', 'Khaled', 'Saleem', 'Ahmad', 'Al-Najjar', true, false],
  ['نور', 'محمد', 'عبدالله', 'الشريف', 'Noor', 'Mohammad', 'Abdullah', 'Al-Sharif', true, true],
  ['عمر', 'فارس', 'يوسف', 'عبيدات', 'Omar', 'Fares', 'Yousef', 'Obeidat', true, false],
  ['هبة', 'ماجد', 'خليل', 'الطراونة', 'Hiba', 'Majed', 'Khalil', 'Al-Tarawneh', false, true],
  ['يوسف', 'إبراهيم', 'علي', 'المصري', 'Yousef', 'Ibrahim', 'Ali', 'Al-Masri', true, false],
  ['رنا', 'سامي', 'حسين', 'الخوالدة', 'Rana', 'Sami', 'Hussein', 'Al-Khawaldeh', true, false],
  ['زيد', 'طارق', 'محمد', 'الرفاعي', 'Zaid', 'Tareq', 'Mohammad', 'Al-Rifai', true, true],
  ['منى', 'جمال', 'أحمد', 'القضاة', 'Mona', 'Jamal', 'Ahmad', 'Al-Qudah', true, false],
  ['طارق', 'نبيل', 'سليمان', 'البطاينة', 'Tareq', 'Nabil', 'Suleiman', 'Bataineh', false, false],
  ['دانا', 'رامي', 'عيسى', 'حجازي', 'Dana', 'Rami', 'Issa', 'Hijazi', true, false],
  ['باسل', 'وليد', 'حسن', 'الكيلاني', 'Basel', 'Waleed', 'Hasan', 'Al-Kilani', true, true],
  ['ريم', 'فادي', 'منصور', 'عودة', 'Reem', 'Fadi', 'Mansour', 'Odeh', true, false],
  ['أنس', 'مأمون', 'خالد', 'الدباس', 'Anas', 'Mamoun', 'Khaled', 'Al-Dabbas', true, false],
  ['لينا', 'هاني', 'يوسف', 'صالح', 'Lina', 'Hani', 'Yousef', 'Saleh', true, true]
];

const teachers = rows.map((row, index) => {

  const teacherId = index + 1;

  return {
    teacherId,
    teacherNumber: `T-${String(teacherId).padStart(4, '0')}`,

    // 101, 102, ... so they never clash with the users / students ids.
    userId: 100 + teacherId,

    firstNameAr: row[0],
    fatherNameAr: row[1],
    grandFatherNameAr: row[2],
    familyNameAr: row[3],

    firstNameEn: row[4],
    fatherNameEn: row[5],
    grandFatherNameEn: row[6],
    familyNameEn: row[7],

    loginId: `teacher${String(teacherId).padStart(3, '0')}`,
    phoneNumber: `07900000${String(teacherId).padStart(2, '0')}`,

    isActive: row[8],
    mustChangePassword: row[9],

    role: 2
  };
});


// =====================================================
// Teachers who can log in
// =====================================================
//
// The teachers above have no login account in the mock.
// The teachers below are the teacher users of data/users.js
// (teacher, officer, teacher2), added with the SAME userId,
// so the Admin can choose one of them as the attendance officer
// and then log in as that teacher to see the result.
// Their teacherId comes after the teachers above (19, 20, 21).

const loginTeachers = users
  .filter(user => user.role === 2)
  .map((user, index) => {

    const teacherId = rows.length + index + 1;

    return {
      teacherId,
      teacherNumber: `T-${String(teacherId).padStart(4, '0')}`,

      // Same userId as the login user: this is the link between them.
      userId: user.userId,

      firstNameAr: user.firstNameAr,
      fatherNameAr: user.fatherNameAr,
      grandFatherNameAr: user.grandFatherNameAr,
      familyNameAr: user.familyNameAr,

      firstNameEn: user.firstNameEn,
      fatherNameEn: user.fatherNameEn,
      grandFatherNameEn: user.grandFatherNameEn,
      familyNameEn: user.familyNameEn,

      loginId: user.loginId,
      phoneNumber: user.phoneNumber,

      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,

      role: 2
    };
  });

teachers.push(...loginTeachers);


module.exports = teachers;
