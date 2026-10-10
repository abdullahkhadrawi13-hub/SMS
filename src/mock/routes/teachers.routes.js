const teachers = require('../data/teachers');
const students = require('../data/students');
const users = require('../data/users');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every teachers response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Roles that can read teachers (list and single teacher):
// 0 = Admin, 1 = Assistant Principal.
const READ_ROLES = [0, 1];

// Roles that can add, edit, activate or deactivate teachers:
// 0 = Admin only.
const WRITE_ROLES = [0];

const TEACHER_ROLE = 2;

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Fields required when adding or editing a teacher.
const NAME_FIELDS = [
  'firstNameAr',
  'fatherNameAr',
  'grandFatherNameAr',
  'familyNameAr',
  'firstNameEn',
  'fatherNameEn',
  'grandFatherNameEn',
  'familyNameEn'
];

const UPDATE_FIELDS = [
  ...NAME_FIELDS,
  'loginId',
  'phoneNumber'
];

const CREATE_FIELDS = [
  ...UPDATE_FIELDS,
  'temporaryPassword'
];


// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// Change them when the real API rules are known.
// =====================================================
//
// 1. A missing field is rejected with 400 and "data" is a list
//    of messages, one per missing field. The real text of the
//    messages is not known.
// 2. Only "required" is checked. The mock does not check the
//    letters of the names, the phone format or the password length.
// 3. The login ID must be different from every other teacher,
//    every student and every user in data/users.js.
//    Small and capital letters are treated as the same.
// 4. The search also matches the full name and the phone number.
// 5. The text of the success messages is not the real text.
// 6. The mock does not create a login account for a new teacher,
//    and deactivating a teacher does not block any login.
//    (Login uses data/users.js only.)
// 7. The mock does not clear the attendance officer setting
//    when a teacher is deactivated.


// =====================================================
// Helpers
// =====================================================

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode);
  res.end(JSON.stringify(body));
}


// 401 / 403 have no body in the real backend.
function sendEmpty(res, statusCode) {
  res.writeHead(statusCode);
  res.end();
}


function sendError(res, statusCode, messageAr, messageEn, data = null) {
  sendJson(res, statusCode, {
    success: false,
    messageAr,
    messageEn,
    data
  });
}


function sendNotFound(res) {
  sendError(
    res,
    404,
    'المعلم غير موجود.',
    'Teacher not found.'
  );
}


function getRequestBody(req) {
  return new Promise((resolve, reject) => {

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {

      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }

    });

    req.on('error', reject);
  });
}


// The user is found by the token sent in the Authorization header.
// (Tokens are in data/users.js, for example: mock-admin-token)
function getCurrentUser(req) {

  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : '';

  return users.find(user => user.token === token) || null;
}


function findTeacher(teacherId) {
  return teachers.find(
    teacher => teacher.teacherId === teacherId
  );
}


// Text fields are saved without spaces at the start or the end.
function clean(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}


// Returns one message for every required field that is missing.
function getMissingFields(data, fields) {
  return fields
    .filter(field => !clean(data[field]))
    .map(field => `${field} is required.`);
}


// True when the login ID belongs to someone else.
// exceptUserId: the user that is being edited (allowed to keep the login ID).
function isLoginIdUsed(loginId, exceptUserId = null) {

  const value = loginId.toLowerCase();

  const sameLoginId = item =>
    item.userId !== exceptUserId &&
    String(item.loginId).toLowerCase() === value;

  return (
    teachers.some(sameLoginId) ||
    students.some(sameLoginId) ||
    users.some(sameLoginId)
  );
}


// T-0001, T-0002, ...
function buildTeacherNumber(teacherId) {
  return `T-${String(teacherId).padStart(4, '0')}`;
}


function getFullNameAr(teacher) {
  return [
    teacher.firstNameAr,
    teacher.fatherNameAr,
    teacher.grandFatherNameAr,
    teacher.familyNameAr
  ]
    .filter(Boolean)
    .join(' ');
}


function getFullNameEn(teacher) {
  return [
    teacher.firstNameEn,
    teacher.fatherNameEn,
    teacher.grandFatherNameEn,
    teacher.familyNameEn
  ]
    .filter(Boolean)
    .join(' ');
}


// True when the search text is found in the teacher number,
// the login ID, the phone number or the Arabic / English names.
function matchesSearch(teacher, searchValue) {

  const values = [
    teacher.teacherNumber,
    teacher.loginId,
    teacher.phoneNumber,

    // Arabic name
    teacher.firstNameAr,
    teacher.fatherNameAr,
    teacher.grandFatherNameAr,
    teacher.familyNameAr,
    getFullNameAr(teacher),

    // English name
    teacher.firstNameEn,
    teacher.fatherNameEn,
    teacher.grandFatherNameEn,
    teacher.familyNameEn,
    getFullNameEn(teacher)
  ];

  return values.some(
    value =>
      String(value)
        .toLowerCase()
        .includes(searchValue)
  );
}


// Copies the name, login ID and phone number from the request to the teacher.
function applyTeacherFields(teacher, data) {

  for (const field of UPDATE_FIELDS) {
    teacher[field] = clean(data[field]);
  }
}


// =====================================================
// Teachers Routes
// =====================================================

function teachersRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  // The frontend calls /api/teachers (small letters).
  // The path is compared in small letters so both forms work.
  const pathname = url.pathname.toLowerCase();


  // =====================================================
  // Only handle Teachers API
  // (/api/teacherassignments is a different API)
  // =====================================================

  if (
    pathname !== '/api/teachers' &&
    !pathname.startsWith('/api/teachers/')
  ) {
    return false;
  }


  if (DELAY_MS > 0) {

    setTimeout(
      () => handleTeachers(req, res, url, pathname),
      DELAY_MS
    );

  } else {

    handleTeachers(req, res, url, pathname);
  }

  return true;
}


function handleTeachers(req, res, url, pathname) {

  // =====================================================
  // Current user (from the token)
  // =====================================================

  const currentUser = getCurrentUser(req);

  if (!currentUser) {
    sendEmpty(res, 401);
    return;
  }

  const canRead =
    READ_ROLES.includes(currentUser.role);

  const canWrite =
    WRITE_ROLES.includes(currentUser.role);


  // /api/teachers/{teacherId}
  const teacherIdMatch = pathname.match(
    /^\/api\/teachers\/(\d+)$/
  );

  // /api/teachers/{teacherId}/status
  const statusMatch = pathname.match(
    /^\/api\/teachers\/(\d+)\/status$/
  );


  // =====================================================
  // GET /api/teachers
  // Paged list with search + status filter
  // (Admin, Assistant Principal)
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/teachers'
  ) {

    if (!canRead) {
      sendEmpty(res, 403);
      return;
    }

    const pageNumber = Math.max(
      Number(url.searchParams.get('pageNumber')) || 1,
      1
    );

    // Default 10, maximum 100.
    const pageSize = Math.min(
      Math.max(
        Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE,
        1
      ),
      MAX_PAGE_SIZE
    );

    const search =
      url.searchParams.get('search');

    const isActive =
      url.searchParams.get('isActive');


    // Sorted by teacherId.
    let filteredTeachers =
      [...teachers].sort(
        (a, b) => a.teacherId - b.teacherId
      );


    // ---------------------------------------------------
    // Search
    // ---------------------------------------------------

    if (search && search.trim()) {

      const searchValue =
        search.toLowerCase().trim();

      filteredTeachers =
        filteredTeachers.filter(
          teacher => matchesSearch(teacher, searchValue)
        );
    }


    // ---------------------------------------------------
    // Active / Inactive filter
    // ---------------------------------------------------

    if (isActive !== null) {

      if (
        isActive !== 'true' &&
        isActive !== 'false'
      ) {

        sendError(
          res,
          400,
          'قيمة حالة المعلم غير صالحة',
          'Invalid teacher active status'
        );

        return;
      }

      const active =
        isActive === 'true';

      filteredTeachers =
        filteredTeachers.filter(
          teacher => teacher.isActive === active
        );
    }


    // ---------------------------------------------------
    // Pagination
    // ---------------------------------------------------

    const totalCount =
      filteredTeachers.length;

    const totalPages =
      Math.ceil(totalCount / pageSize);

    const startIndex =
      (pageNumber - 1) * pageSize;

    const items =
      filteredTeachers.slice(
        startIndex,
        startIndex + pageSize
      );


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب المعلمين بنجاح',
      messageEn: 'Teachers retrieved successfully',

      data: {
        items,
        totalCount,
        pageNumber,
        pageSize,
        totalPages
      }
    });

    return;
  }


  // =====================================================
  // GET /api/teachers/{teacherId}
  // One teacher
  // (Admin, Assistant Principal)
  // =====================================================

  if (
    req.method === 'GET' &&
    teacherIdMatch
  ) {

    if (!canRead) {
      sendEmpty(res, 403);
      return;
    }

    const teacher =
      findTeacher(Number(teacherIdMatch[1]));

    if (!teacher) {
      sendNotFound(res);
      return;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب بيانات المعلم بنجاح',
      messageEn: 'Teacher retrieved successfully',
      data: teacher
    });

    return;
  }


  // =====================================================
  // POST /api/teachers
  // Create teacher
  // (Admin)
  // =====================================================

  if (
    req.method === 'POST' &&
    pathname === '/api/teachers'
  ) {

    if (!canWrite) {
      sendEmpty(res, 403);
      return;
    }

    getRequestBody(req)
      .then(data => {

        // -------------------------------------------------
        // Required fields
        // -------------------------------------------------

        const missingFields =
          getMissingFields(data, CREATE_FIELDS);

        if (missingFields.length > 0) {

          sendError(
            res,
            400,
            'جميع الحقول المطلوبة يجب إدخالها',
            'All required fields must be provided',
            missingFields
          );

          return;
        }


        // -------------------------------------------------
        // Check duplicate Login ID
        // -------------------------------------------------

        if (isLoginIdUsed(clean(data.loginId))) {

          sendError(
            res,
            400,
            'اسم المستخدم مستخدم من قبل مستخدم آخر.',
            'This login ID is already used by another user.'
          );

          return;
        }


        // -------------------------------------------------
        // Generate IDs
        // -------------------------------------------------

        const newTeacherId =
          teachers.length > 0
            ? Math.max(
                ...teachers.map(
                  teacher => teacher.teacherId
                )
              ) + 1
            : 1;

        const newUserId =
          teachers.length > 0
            ? Math.max(
                ...teachers.map(
                  teacher => teacher.userId
                )
              ) + 1
            : 101;


        // -------------------------------------------------
        // Create teacher
        // (the temporary password is not saved in the mock)
        // -------------------------------------------------

        const newTeacher = {
          teacherId: newTeacherId,
          teacherNumber: buildTeacherNumber(newTeacherId),
          userId: newUserId
        };

        applyTeacherFields(newTeacher, data);

        newTeacher.isActive = true;
        newTeacher.mustChangePassword = true;
        newTeacher.role = TEACHER_ROLE;

        teachers.push(newTeacher);


        sendJson(res, 201, {
          success: true,
          messageAr: 'تمت إضافة المعلم بنجاح',
          messageEn: 'Teacher created successfully',
          data: newTeacher
        });

      })
      .catch(() => {

        sendError(
          res,
          400,
          'بيانات الطلب غير صالحة',
          'Invalid request body'
        );

      });

    return;
  }


  // =====================================================
  // PUT /api/teachers/{teacherId}
  // Update teacher (same body as creation, without the password)
  // (Admin)
  // =====================================================

  if (
    req.method === 'PUT' &&
    teacherIdMatch
  ) {

    if (!canWrite) {
      sendEmpty(res, 403);
      return;
    }

    const teacher =
      findTeacher(Number(teacherIdMatch[1]));

    if (!teacher) {
      sendNotFound(res);
      return;
    }

    getRequestBody(req)
      .then(data => {

        // -------------------------------------------------
        // Required fields (every field is required,
        // there is no partial update)
        // -------------------------------------------------

        const missingFields =
          getMissingFields(data, UPDATE_FIELDS);

        if (missingFields.length > 0) {

          sendError(
            res,
            400,
            'جميع الحقول المطلوبة يجب إدخالها',
            'All required fields must be provided',
            missingFields
          );

          return;
        }


        // -------------------------------------------------
        // Check duplicate Login ID
        // -------------------------------------------------

        if (isLoginIdUsed(clean(data.loginId), teacher.userId)) {

          sendError(
            res,
            400,
            'اسم المستخدم مستخدم من قبل مستخدم آخر.',
            'This login ID is already used by another user.'
          );

          return;
        }


        // -------------------------------------------------
        // Update teacher
        // (teacherNumber, role, status and password never change here)
        // -------------------------------------------------

        applyTeacherFields(teacher, data);


        sendJson(res, 200, {
          success: true,
          messageAr: 'تم تعديل بيانات المعلم بنجاح',
          messageEn: 'Teacher updated successfully',
          data: teacher
        });

      })
      .catch(() => {

        sendError(
          res,
          400,
          'بيانات الطلب غير صالحة',
          'Invalid request body'
        );

      });

    return;
  }


  // =====================================================
  // PATCH /api/teachers/{teacherId}/status?isActive=true
  // Activate / Deactivate teacher
  // (Admin)
  // =====================================================

  if (
    req.method === 'PATCH' &&
    statusMatch
  ) {

    if (!canWrite) {
      sendEmpty(res, 403);
      return;
    }

    const teacher =
      findTeacher(Number(statusMatch[1]));

    if (!teacher) {
      sendNotFound(res);
      return;
    }


    // -------------------------------------------------
    // Validate isActive
    // -------------------------------------------------

    const isActive =
      url.searchParams.get('isActive');

    if (
      isActive !== 'true' &&
      isActive !== 'false'
    ) {

      sendError(
        res,
        400,
        'قيمة حالة المعلم غير صالحة',
        'Invalid teacher active status'
      );

      return;
    }


    // -------------------------------------------------
    // Update status
    // -------------------------------------------------

    teacher.isActive =
      isActive === 'true';


    sendJson(res, 200, {
      success: true,

      messageAr:
        teacher.isActive
          ? 'تم تفعيل المعلم بنجاح'
          : 'تم تعطيل المعلم بنجاح',

      messageEn:
        teacher.isActive
          ? 'Teacher activated successfully'
          : 'Teacher deactivated successfully',

      data: teacher
    });

    return;
  }


  // =====================================================
  // Unknown Teachers endpoint
  // =====================================================

  sendError(
    res,
    404,
    'نقطة النهاية غير موجودة',
    'Teacher endpoint not found'
  );
}


module.exports = teachersRoutes;
