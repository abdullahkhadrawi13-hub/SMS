const http = require('http');

const PORT =3000 //5253//3000;//;

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
  }
];
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

    firstNameAr: `طالب`,
    fatherNameAr: `أحمد`,
    grandFatherNameAr: `محمد`,
    familyNameAr: `رقم ${i}`,

    firstNameEn: `Student`,
    fatherNameEn: `Ahmad`,
    grandFatherNameEn: `Mohammad`,
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


const sections = [
  {
    sectionId: 1,
    classId: 1,
    classNameAr: 'الصف الأول',
    classNameEn: 'First Grade',
    sectionAr: 'أ',
    sectionEn: 'A',
    studentCount: 25,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 2,
    classId: 1,
    classNameAr: 'الصف الأول',
    classNameEn: 'First Grade',
    sectionAr: 'ب',
    sectionEn: 'B',
    studentCount: 23,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 3,
    classId: 1,
    classNameAr: 'الصف الأول',
    classNameEn: 'First Grade',
    sectionAr: 'ج',
    sectionEn: 'C',
    studentCount: 21,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },

  {
    sectionId: 4,
    classId: 2,
    classNameAr: 'الصف الثاني',
    classNameEn: 'Second Grade',
    sectionAr: 'أ',
    sectionEn: 'A',
    studentCount: 27,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 5,
    classId: 2,
    classNameAr: 'الصف الثاني',
    classNameEn: 'Second Grade',
    sectionAr: 'ب',
    sectionEn: 'B',
    studentCount: 24,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 6,
    classId: 2,
    classNameAr: 'الصف الثاني',
    classNameEn: 'Second Grade',
    sectionAr: 'ج',
    sectionEn: 'C',
    studentCount: 22,
    isActive: false,
    academicYearId: 1,
    academicTermId: 1
  },

  {
    sectionId: 7,
    classId: 3,
    classNameAr: 'الصف الثالث',
    classNameEn: 'Third Grade',
    sectionAr: 'أ',
    sectionEn: 'A',
    studentCount: 26,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 8,
    classId: 3,
    classNameAr: 'الصف الثالث',
    classNameEn: 'Third Grade',
    sectionAr: 'ب',
    sectionEn: 'B',
    studentCount: 28,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 9,
    classId: 3,
    classNameAr: 'الصف الثالث',
    classNameEn: 'Third Grade',
    sectionAr: 'ج',
    sectionEn: 'C',
    studentCount: 20,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },

  {
    sectionId: 10,
    classId: 4,
    classNameAr: 'الصف الرابع',
    classNameEn: 'Fourth Grade',
    sectionAr: 'أ',
    sectionEn: 'A',
    studentCount: 29,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 11,
    classId: 4,
    classNameAr: 'الصف الرابع',
    classNameEn: 'Fourth Grade',
    sectionAr: 'ب',
    sectionEn: 'B',
    studentCount: 25,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 12,
    classId: 4,
    classNameAr: 'الصف الرابع',
    classNameEn: 'Fourth Grade',
    sectionAr: 'ج',
    sectionEn: 'C',
    studentCount: 24,
    isActive: false,
    academicYearId: 1,
    academicTermId: 1
  },

  {
    sectionId: 13,
    classId: 5,
    classNameAr: 'الصف الخامس',
    classNameEn: 'Fifth Grade',
    sectionAr: 'أ',
    sectionEn: 'A',
    studentCount: 27,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 14,
    classId: 5,
    classNameAr: 'الصف الخامس',
    classNameEn: 'Fifth Grade',
    sectionAr: 'ب',
    sectionEn: 'B',
    studentCount: 26,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },

  {
    sectionId: 15,
    classId: 6,
    classNameAr: 'الصف السادس',
    classNameEn: 'Sixth Grade',
    sectionAr: 'أ',
    sectionEn: 'A',
    studentCount: 28,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  },
  {
    sectionId: 16,
    classId: 6,
    classNameAr: 'الصف السادس',
    classNameEn: 'Sixth Grade',
    sectionAr: 'ب',
    sectionEn: 'B',
    studentCount: 27,
    isActive: true,
    academicYearId: 1,
    academicTermId: 1
  }
];





const server = http.createServer((req, res) => {

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =========================
  // Sections API
  // =========================

  if (
    req.method === 'GET' &&
    req.url.startsWith('/api/Sections')
  ) {

    const url = new URL(
      req.url,
      `http://localhost:${PORT}`
    );

    const pageNumber =
      Number(url.searchParams.get('pageNumber')) || 1;

    const pageSize =
      Number(url.searchParams.get('pageSize')) || 10;

    const academicYearId =
      url.searchParams.get('academicYearId');

    const academicTermId =
      url.searchParams.get('academicTermId');

    const classId =
      url.searchParams.get('classId');

    const sectionId =
      url.searchParams.get('sectionId');

    const isActive =
      url.searchParams.get('isActive');


    // -------------------------
    // Filtering
    // -------------------------

    let filteredSections = [...sections];


    if (academicYearId !== null) {
      filteredSections = filteredSections.filter(
        section =>
          section.academicYearId === Number(academicYearId)
      );
    }


    if (academicTermId !== null) {
      filteredSections = filteredSections.filter(
        section =>
          section.academicTermId === Number(academicTermId)
      );
    }


    if (classId !== null) {
      filteredSections = filteredSections.filter(
        section =>
          section.classId === Number(classId)
      );
    }


    if (sectionId !== null) {
      filteredSections = filteredSections.filter(
        section =>
          section.sectionId === Number(sectionId)
      );
    }


    if (isActive !== null) {

      const active =
        isActive === 'true';

      filteredSections =
        filteredSections.filter(
          section =>
            section.isActive === active
        );
    }


    // -------------------------
    // Pagination
    // -------------------------

    const totalCount =
      filteredSections.length;

    const totalPages =
      Math.ceil(totalCount / pageSize);

    const startIndex =
      (pageNumber - 1) * pageSize;

    const items =
      filteredSections.slice(
        startIndex,
        startIndex + pageSize
      );


    // -------------------------
    // Response
    // -------------------------

    res.writeHead(200);

    res.end(
      JSON.stringify({
        success: true,
        messageAr: 'تم جلب الصفوف بنجاح',
        messageEn: 'Sections retrieved successfully',
        data: {
          items,
          totalCount,
          pageNumber,
          pageSize,
          totalPages
        }
      })
    );

    return;
  }




    if (
  req.method === 'GET' &&
  req.url.startsWith('/api/Students')
) {

  const url = new URL(req.url, `http://localhost:${PORT}`);

  const pageNumber =
    Number(url.searchParams.get('pageNumber')) || 1;

  const pageSize =
    Number(url.searchParams.get('pageSize')) || 10;

  const totalCount = students.length;

  const totalPages =
    Math.ceil(totalCount / pageSize);

  const startIndex =
    (pageNumber - 1) * pageSize;

  const items =
    students.slice(
      startIndex,
      startIndex + pageSize
    );

  res.writeHead(200);

  res.end(
    JSON.stringify({
      success: true,
      message: 'Students retrieved successfully.',
      data: {
        items,
        totalCount,
        pageNumber,
        pageSize,
        totalPages
      }
    })
  );

  return;
}



  if (
    req.method === 'POST' &&
    req.url === '/api/Auth/Login'
  ) {

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {

      try {

        const loginData = JSON.parse(body);

        const user = users.find(
          u =>
            u.loginId === loginData.loginId &&
            u.password === loginData.password
        );

        if (!user) {

          res.writeHead(401);

          res.end(
            JSON.stringify({
              success: false,
              message: 'Invalid login credentials',
              data: null
            })
          );

          return;
        }

        if (!user.isActive) {

          res.writeHead(403);

          res.end(
            JSON.stringify({
              success: false,
              message: 'User is inactive',
              data: null
            })
          );

          return;
        }

        const response = {
          success: true,
          message: 'Login successful',

          data: {
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

            mustChangePassword: user.mustChangePassword,
            isActive: user.isActive,

            role: user.role,

            phoneNumber: user.phoneNumber,

            token: user.token
          }
        };

        res.writeHead(200);

        res.end(JSON.stringify(response));

      } catch {

        res.writeHead(400);

        res.end(
          JSON.stringify({
            success: false,
            message: 'Invalid request',
            data: null
          })
        );
      }
    });

    return;
  }

  res.writeHead(404);

  res.end(
    JSON.stringify({
      success: false,
      message: 'Endpoint not found',
      data: null
    })
  );
});

server.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT}`);
});


