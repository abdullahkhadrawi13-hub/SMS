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

  // The teacher who is the attendance officer when the mock starts
  // (see data/school-settings.js). The Admin can change the officer
  // from Settings > Attendance Officer.
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

  // A teacher who is NOT the attendance officer when the mock starts.
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
  },

  // حساب جديد بكلمة مرور مؤقتة: لتجربة شاشة أول تسجيل دخول
  // (دخول: newuser / Temp@1234 ثم اختيار كلمة مرور جديدة)
  // يعود لحالته الأولى عند إعادة تشغيل الـ mock
  {
    userId: 8,

    firstNameAr: 'سلمى',
    fatherNameAr: 'نبيل',
    grandFatherNameAr: 'فايز',
    familyNameAr: 'العبادي',

    firstNameEn: 'Salma',
    fatherNameEn: 'Nabil',
    grandFatherNameEn: 'Fayez',
    familyNameEn: 'Al-Abbadi',

    loginId: 'newuser',
    password: '1234',

    mustChangePassword: true,
    isActive: true,

    role: 1,

    phoneNumber: '0790000007',

    token: 'mock-newuser-token'
  }
];

module.exports = users;