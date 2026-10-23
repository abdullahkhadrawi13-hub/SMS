// Parents (API Reference, section 14).
//
// A parent account is a user with role 4 (Parent).
// The links between parents and students are kept in "parentStudents"
// (one row per link), like the ParentStudents table in the backend.
//
// relationship: 0 Father, 1 Mother, 2 Guardian.
// A student has at most one father and one mother; guardians have no limit.
//
// Things to try (Parents page):
// - Parent 1 is the "parent" login of data/users.js (mock-parent-token).
// - Phone 0792222333 (parent 2): type it in the add form to see
//   the "a parent is already registered with this number" notice.
// - Student 2 already has a father (parent 2) and a mother (parent 1):
//   both buttons are disabled when you link him to someone else.
// - Student 7 is graduated (studentStatus 2), student 13 is graduated
//   and deactivated.
// - Parent 5 is deactivated and has no children.

const NAME_PARTS = {
  ar: ['محمود', 'سامر', 'وليد', 'عمر', 'باسل', 'زياد', 'فادي', 'رامي'],
  en: ['Mahmoud', 'Samer', 'Waleed', 'Omar', 'Basel', 'Ziad', 'Fadi', 'Rami']
};


const parents = [
  {
    parentId: 1,
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
    phoneNumber: '0790000004',

    isActive: true,
    mustChangePassword: false,

    role: 4
  },

  {
    parentId: 2,
    userId: 201,

    firstNameAr: 'خالد',
    fatherNameAr: 'أحمد',
    grandFatherNameAr: 'علي',
    familyNameAr: 'الخطيب',

    firstNameEn: 'Khaled',
    fatherNameEn: 'Ahmad',
    grandFatherNameEn: 'Ali',
    familyNameEn: 'Al-Khatib',

    loginId: 'khaled.k',
    phoneNumber: '0792222333',

    isActive: true,
    mustChangePassword: false,

    role: 4
  },

  {
    parentId: 3,
    userId: 202,

    firstNameAr: 'منى',
    fatherNameAr: 'يوسف',
    grandFatherNameAr: 'حسن',
    familyNameAr: 'العمري',

    firstNameEn: 'Mona',
    fatherNameEn: 'Yousef',
    grandFatherNameEn: 'Hasan',
    familyNameEn: 'Al-Omari',

    loginId: 'mona.o',
    phoneNumber: '0785550147',

    isActive: true,
    mustChangePassword: true,

    role: 4
  },

  {
    parentId: 4,
    userId: 203,

    firstNameAr: 'رنا',
    fatherNameAr: 'سامي',
    grandFatherNameAr: 'فؤاد',
    familyNameAr: 'الحوراني',

    firstNameEn: 'Rana',
    fatherNameEn: 'Sami',
    grandFatherNameEn: 'Fouad',
    familyNameEn: 'Al-Hourani',

    loginId: 'rana.h',
    phoneNumber: '0779023118',

    isActive: true,
    mustChangePassword: false,

    role: 4
  },

  {
    parentId: 5,
    userId: 204,

    firstNameAr: 'إبراهيم',
    fatherNameAr: 'سالم',
    grandFatherNameAr: 'عيد',
    familyNameAr: 'الزعبي',

    firstNameEn: 'Ibrahim',
    fatherNameEn: 'Salem',
    grandFatherNameEn: 'Eid',
    familyNameEn: 'Al-Zoubi',

    loginId: 'ibrahim.z',
    phoneNumber: '0776601239',

    isActive: false,
    mustChangePassword: true,

    role: 4
  },

  {
    parentId: 6,
    userId: 205,

    firstNameAr: 'محمد',
    fatherNameAr: 'يوسف',
    grandFatherNameAr: 'حسن',
    familyNameAr: 'العمري',

    firstNameEn: 'Mohammad',
    fatherNameEn: 'Yousef',
    grandFatherNameEn: 'Hasan',
    familyNameEn: 'Al-Omari',

    loginId: 'mohammad.o',
    phoneNumber: '0795512870',

    isActive: true,
    mustChangePassword: false,

    role: 4
  }
];


// More parents (7 to 14), so the list has a second page.
// Each one is the father of one student (students 20 to 27).
for (let i = 0; i < NAME_PARTS.ar.length; i++) {

  const parentId = 7 + i;

  parents.push({
    parentId,
    userId: 200 + parentId,

    firstNameAr: NAME_PARTS.ar[i],
    fatherNameAr: 'أحمد',
    grandFatherNameAr: 'محمد',
    familyNameAr: 'العبداللات',

    firstNameEn: NAME_PARTS.en[i],
    fatherNameEn: 'Ahmad',
    grandFatherNameEn: 'Mohammad',
    familyNameEn: 'Al-Abdallat',

    loginId: `parent${String(parentId).padStart(3, '0')}`,
    phoneNumber: `07955${String(parentId).padStart(5, '0')}`,

    isActive: true,
    mustChangePassword: false,

    role: 4
  });
}


// The links (ParentStudents): parentId + studentId + relationship.
const parentStudents = [
  { parentId: 1, studentId: 2, relationship: 1 },
  { parentId: 1, studentId: 8, relationship: 1 },

  { parentId: 2, studentId: 2, relationship: 0 },
  { parentId: 2, studentId: 7, relationship: 0 },

  { parentId: 3, studentId: 3, relationship: 1 },
  { parentId: 3, studentId: 4, relationship: 1 },
  { parentId: 3, studentId: 5, relationship: 1 },

  { parentId: 4, studentId: 13, relationship: 2 },

  { parentId: 6, studentId: 5, relationship: 0 }
];

for (let i = 0; i < NAME_PARTS.ar.length; i++) {
  parentStudents.push({
    parentId: 7 + i,
    studentId: 20 + i,
    relationship: 0
  });
}


module.exports = {
  parents,
  parentStudents
};
