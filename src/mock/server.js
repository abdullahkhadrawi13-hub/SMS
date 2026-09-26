const http = require('http');

const PORT = 3000//5253//3000;//;

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

    isActive: true,
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


