const users = [
  {
    userId: 1,

    firstNameAr: 'عبدالله',
    fatherNameAr: 'محمد',
    grandFatherNameAr: 'علي',
    familyNameAr: 'الخضراوي',

    firstNameEn: 'Abdullah',
    fatherNameEn: 'Mohammad',
    grandFatherNameEn: 'Ali',
    familyNameEn: 'Khadrawi',

    loginId: 'admin',
    password: '123',

    mustChangePassword: false,
    isActive: true,

    role: 0,

    phoneNumber: '0790000000',

    token: 'mock-admin-token'
  },

  {
    userId: 2,

    firstNameAr: 'أحمد',
    fatherNameAr: 'محمد',
    grandFatherNameAr: 'علي',
    familyNameAr: 'حسن',

    firstNameEn: 'Ahmad',
    fatherNameEn: 'Mohammad',
    grandFatherNameEn: 'Ali',
    familyNameEn: 'Hassan',

    loginId: 'assistant',
    password: '123',

    mustChangePassword: false,
    isActive: true,

    role: 1,

    phoneNumber: '0790000001',

    token: 'mock-assistant-token'
  },

  {
    userId: 3,

    firstNameAr: 'خالد',
    fatherNameAr: 'محمد',
    grandFatherNameAr: 'علي',
    familyNameAr: 'حسن',

    firstNameEn: 'Khaled',
    fatherNameEn: 'Mohammad',
    grandFatherNameEn: 'Ali',
    familyNameEn: 'Hassan',

    loginId: 'teacher',
    password: '123',

    mustChangePassword: false,
    isActive: true,

    role: 2,

    phoneNumber: '0790000002',

    token: 'mock-teacher-token'
  },

  {
    userId: 4,

    firstNameAr: 'عمر',
    fatherNameAr: 'خالد',
    grandFatherNameAr: 'محمود',
    familyNameAr: 'علي',

    firstNameEn: 'Omar',
    fatherNameEn: 'Khaled',
    grandFatherNameEn: 'Mahmoud',
    familyNameEn: 'Ali',

    loginId: 'student',
    password: '123',

    mustChangePassword: false,
    isActive: true,

    role: 3,

    phoneNumber: '0790000003',

    token: 'mock-student-token'
  },

  {
    userId: 5,

    firstNameAr: 'سارة',
    fatherNameAr: 'خالد',
    grandFatherNameAr: 'محمود',
    familyNameAr: 'علي',

    firstNameEn: 'Sarah',
    fatherNameEn: 'Khaled',
    grandFatherNameEn: 'Mahmoud',
    familyNameEn: 'Ali',

    loginId: 'parent',
    password: '123',

    mustChangePassword: false,
    isActive: true,

    role: 4,

    phoneNumber: '0790000004',

    token: 'mock-parent-token'
  },

  // A teacher who IS the attendance officer
  // (see ATTENDANCE_OFFICER_USER_ID in routes/attendance.routes.js).
  {
    userId: 6,

    firstNameAr: 'ليلى',
    fatherNameAr: 'سامي',
    grandFatherNameAr: 'يوسف',
    familyNameAr: 'النجار',

    firstNameEn: 'Layla',
    fatherNameEn: 'Sami',
    grandFatherNameEn: 'Yousef',
    familyNameEn: 'Al-Najjar',

    loginId: 'officer',
    password: '123',

    mustChangePassword: false,
    isActive: true,

    role: 2,

    phoneNumber: '0790000005',

    token: 'mock-officer-token'
  },

  // A teacher who is NOT the attendance officer.
  {
    userId: 7,

    firstNameAr: 'ماجد',
    fatherNameAr: 'عمر',
    grandFatherNameAr: 'حسين',
    familyNameAr: 'الزعبي',

    firstNameEn: 'Majed',
    fatherNameEn: 'Omar',
    grandFatherNameEn: 'Hussein',
    familyNameEn: 'Al-Zoubi',

    loginId: 'teacher2',
    password: '123',

    mustChangePassword: false,
    isActive: true,

    role: 2,

    phoneNumber: '0790000006',

    token: 'mock-teacher2-token'
  }
];

module.exports = users;