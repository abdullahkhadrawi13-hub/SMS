const teacherAssignments = require('../data/teacher-assignments');
const teachers = require('../data/teachers');
const subjects = require('../data/subjects');
const sections = require('../data/sections');
const schoolClasses = require('../data/school-classes');
const academicTerms = require('../data/academic-terms');
const users = require('../data/users');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Roles that can read the list and one assignment:
// 0 = Admin, 1 = Assistant Principal. A teacher gets 403 (they use /mine).
const READ_ROLES = [0, 1];

// Roles that can add, edit, activate or deactivate assignments:
// 0 = Admin only.
const WRITE_ROLES = [0];

// Only a teacher can call GET /api/teacherassignments/mine (Admin gets 403).
const TEACHER_ROLE = 2;


// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// Change them when the real API rules are known.
// =====================================================
//
// 1. The list is sorted by teacherAssignmentId.
// 2. Creating an assignment with an INACTIVE teacher is allowed
//    (the API Reference only says the teacher must exist).
// 3. The same subject cannot be added twice to the same term, class
//    and section, even when the old assignment is inactive.
// 4. The mock does not keep student enrollments, assessments or grades.
//    Activating / deactivating only changes isActive.
// 5. The text of the messages is not the real text.


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
    'التكليف غير موجود.',
    'Teacher assignment not found.'
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


function findAssignment(assignmentId) {
  return teacherAssignments.find(
    a => a.teacherAssignmentId === assignmentId
  );
}


// "true" / "false" / missing (null). Anything else = invalid.
function readBoolean(value) {

  if (value === null) {
    return { ok: true, value: undefined };
  }

  if (value === 'true' || value === 'false') {
    return { ok: true, value: value === 'true' };
  }

  return { ok: false };
}


// Passing mark: above 0 and at most 100.
function isValidPassingMark(value) {
  const mark = Number(value);
  return typeof value === 'number' && mark > 0 && mark <= 100;
}


// The teacher's four-part name: each part trimmed, joined with one space
// (like the real backend, updated 2026-10-16).
function teacherFullName(teacher, lang) {

  if (!teacher) {
    return '';
  }

  return [
    teacher['firstName' + lang],
    teacher['fatherName' + lang],
    teacher['grandFatherName' + lang],
    teacher['familyName' + lang]
  ]
    .map(part => (part || '').trim())
    .filter(part => part !== '')
    .join(' ');
}


// The stored assignment + the names, like TeacherAssignmentDto.
function toDto(assignment) {

  const teacher = teachers.find(t => t.teacherId === assignment.teacherId);
  const term = academicTerms.find(t => t.academicTermId === assignment.academicTermId);
  const schoolClass = schoolClasses.find(c => c.schoolClassId === assignment.classId);
  const section = sections.find(s => s.sectionId === assignment.sectionId);
  const subject = subjects.find(s => s.subjectId === assignment.subjectId);

  return {
    teacherAssignmentId: assignment.teacherAssignmentId,

    teacherId: assignment.teacherId,
    teacherNumber: teacher ? teacher.teacherNumber : '',
    teacherNameAr: teacherFullName(teacher, 'Ar'),
    teacherNameEn: teacherFullName(teacher, 'En'),
    isTeacherActive: teacher ? teacher.isActive : false,

    academicTermId: assignment.academicTermId,
    academicTermNameAr: term ? term.nameAr : '',
    academicTermNameEn: term ? term.nameEn : '',

    classId: assignment.classId,
    classNameAr: schoolClass ? schoolClass.classNameAr : '',
    classNameEn: schoolClass ? schoolClass.classNameEn : '',

    sectionId: assignment.sectionId,
    sectionAr: section ? section.sectionAr : '',
    sectionEn: section ? section.sectionEn : '',

    subjectId: assignment.subjectId,
    subjectAr: subject ? subject.subjectAr : '',
    subjectEn: subject ? subject.subjectEn : '',

    passingMark: assignment.passingMark,
    isAssessmentStructureLocked: assignment.isAssessmentStructureLocked,
    isActive: assignment.isActive
  };
}


// Checks the body of POST /api/teacherassignments.
// Returns an error [messageAr, messageEn], or null when the body is valid.
function validateCreate(data) {

  const numberFields = [
    'teacherId',
    'academicTermId',
    'classId',
    'sectionId',
    'subjectId'
  ];

  const missing = numberFields.filter(
    field => !Number.isInteger(data[field])
  );

  if (missing.length > 0 || data.passingMark === undefined) {
    return [
      'يرجى تعبئة جميع الحقول المطلوبة.',
      'All required fields must be provided.'
    ];
  }

  if (!teachers.some(t => t.teacherId === data.teacherId)) {
    return ['المعلم غير موجود.', 'Teacher not found.'];
  }

  if (!academicTerms.some(t => t.academicTermId === data.academicTermId)) {
    return ['الفصل الدراسي غير موجود.', 'Academic term not found.'];
  }

  const schoolClass = schoolClasses.find(c => c.schoolClassId === data.classId);

  if (!schoolClass) {
    return ['الصف غير موجود.', 'Class not found.'];
  }

  if (!schoolClass.isActive) {
    return ['الصف غير فعال.', 'The class is inactive.'];
  }

  const section = sections.find(s => s.sectionId === data.sectionId);

  if (!section) {
    return ['الشعبة غير موجودة.', 'Section not found.'];
  }

  if (!section.isActive) {
    return ['الشعبة غير فعالة.', 'The section is inactive.'];
  }

  if (section.classId !== data.classId) {
    return [
      'الشعبة لا تتبع هذا الصف.',
      'The section does not belong to this class.'
    ];
  }

  const subject = subjects.find(s => s.subjectId === data.subjectId);

  if (!subject) {
    return ['المادة غير موجودة.', 'Subject not found.'];
  }

  if (!subject.isActive) {
    return ['المادة غير فعالة.', 'The subject is inactive.'];
  }

  if (!isValidPassingMark(data.passingMark)) {
    return [
      'علامة النجاح يجب أن تكون أكبر من 0 ولا تتجاوز 100.',
      'Passing mark must be greater than 0 and at most 100.'
    ];
  }

  const alreadyAssigned = teacherAssignments.some(
    a =>
      a.academicTermId === data.academicTermId &&
      a.classId === data.classId &&
      a.sectionId === data.sectionId &&
      a.subjectId === data.subjectId
  );

  if (alreadyAssigned) {
    return [
      'هذه المادة مضافة مسبقًا لهذه الشعبة في هذا الفصل الدراسي.',
      'This subject is already assigned for this class, section and term.'
    ];
  }

  return null;
}


// =====================================================
// Teacher Assignments Routes
// =====================================================

function teacherAssignmentsRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  // The path is compared in small letters so /api/TeacherAssignments works too.
  const pathname = url.pathname.toLowerCase();

  if (
    pathname !== '/api/teacherassignments' &&
    !pathname.startsWith('/api/teacherassignments/')
  ) {
    return false;
  }


  if (DELAY_MS > 0) {

    setTimeout(
      () => handleAssignments(req, res, url, pathname),
      DELAY_MS
    );

  } else {

    handleAssignments(req, res, url, pathname);
  }

  return true;
}


async function handleAssignments(req, res, url, pathname) {

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


  // /api/teacherassignments/{assignmentId}
  const idMatch = pathname.match(
    /^\/api\/teacherassignments\/(\d+)$/
  );

  // /api/teacherassignments/{assignmentId}/status
  const statusMatch = pathname.match(
    /^\/api\/teacherassignments\/(\d+)\/status$/
  );


  // =====================================================
  // GET /api/teacherassignments/mine
  // The logged-in teacher's ACTIVE assignments (Teacher only)
  // academicTermId is optional; without it the current term is used.
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/teacherassignments/mine'
  ) {

    if (currentUser.role !== TEACHER_ROLE) {
      sendEmpty(res, 403);
      return;
    }

    // The teacher and the login user are linked by the same userId.
    const teacher = teachers.find(t => t.userId === currentUser.userId);

    if (!teacher) {
      sendError(
        res,
        400,
        'لا يوجد ملف معلم لهذا المستخدم.',
        'No teacher profile was found for this user.'
      );
      return;
    }

    let termId = Number(url.searchParams.get('academicTermId')) || null;

    if (termId === null) {

      const currentTerm = academicTerms.find(t => t.isCurrent);

      if (!currentTerm) {
        sendError(
          res,
          400,
          'لا يوجد فصل دراسي حالي.',
          'No current academic term is configured.'
        );
        return;
      }

      termId = currentTerm.academicTermId;
    }

    const data = teacherAssignments
      .filter(
        a =>
          a.teacherId === teacher.teacherId &&
          a.academicTermId === termId &&
          a.isActive
      )
      .map(toDto);

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب موادك بنجاح',
      messageEn: 'Your assignments retrieved successfully',
      data
    });

    return;
  }


  // =====================================================
  // GET /api/teacherassignments?teacherId=&academicTermId=&isActive=
  // Unpaged list (Admin, Assistant Principal)
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/teacherassignments'
  ) {

    if (!canRead) {
      sendEmpty(res, 403);
      return;
    }

    const teacherId = Number(url.searchParams.get('teacherId')) || null;
    const termId = Number(url.searchParams.get('academicTermId')) || null;
    const isActive = readBoolean(url.searchParams.get('isActive'));

    if (!isActive.ok) {
      sendError(
        res,
        400,
        'قيمة الحالة غير صالحة.',
        'Invalid active status.'
      );
      return;
    }

    const data = teacherAssignments
      .filter(a =>
        (teacherId === null || a.teacherId === teacherId) &&
        (termId === null || a.academicTermId === termId) &&
        (isActive.value === undefined || a.isActive === isActive.value)
      )
      .sort((a, b) => a.teacherAssignmentId - b.teacherAssignmentId)
      .map(toDto);

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب التكليفات بنجاح',
      messageEn: 'Teacher assignments retrieved successfully',
      data
    });

    return;
  }


  // =====================================================
  // GET /api/teacherassignments/{assignmentId}
  // One assignment (Admin, Assistant Principal)
  // =====================================================

  if (
    req.method === 'GET' &&
    idMatch
  ) {

    if (!canRead) {
      sendEmpty(res, 403);
      return;
    }

    const assignment = findAssignment(Number(idMatch[1]));

    if (!assignment) {
      sendNotFound(res);
      return;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب التكليف بنجاح',
      messageEn: 'Teacher assignment retrieved successfully',
      data: toDto(assignment)
    });

    return;
  }


  // =====================================================
  // POST /api/teacherassignments
  // Add a subject to a section (Admin)
  // =====================================================

  if (
    req.method === 'POST' &&
    pathname === '/api/teacherassignments'
  ) {

    if (!canWrite) {
      sendEmpty(res, 403);
      return;
    }

    let data;

    try {
      data = await getRequestBody(req);
    } catch {
      sendError(res, 400, 'بيانات الطلب غير صالحة.', 'Invalid request body.');
      return;
    }

    const error = validateCreate(data);

    if (error) {
      sendError(res, 400, error[0], error[1]);
      return;
    }

    const assignment = {
      teacherAssignmentId:
        Math.max(0, ...teacherAssignments.map(a => a.teacherAssignmentId)) + 1,
      teacherId: data.teacherId,
      academicTermId: data.academicTermId,
      classId: data.classId,
      sectionId: data.sectionId,
      subjectId: data.subjectId,
      passingMark: Number(data.passingMark),
      isAssessmentStructureLocked: false,
      isActive: true
    };

    teacherAssignments.push(assignment);

    sendJson(res, 201, {
      success: true,
      messageAr: 'تمت إضافة المادة للشعبة بنجاح.',
      messageEn: 'Teacher assignment created successfully.',
      data: toDto(assignment)
    });

    return;
  }


  // =====================================================
  // PUT /api/teacherassignments/{assignmentId}
  // Edit the teacher and the passing mark only (Admin).
  // The term, class, section and subject are ignored if sent.
  // =====================================================

  if (
    req.method === 'PUT' &&
    idMatch
  ) {

    if (!canWrite) {
      sendEmpty(res, 403);
      return;
    }

    const assignment = findAssignment(Number(idMatch[1]));

    if (!assignment) {
      sendNotFound(res);
      return;
    }

    let data;

    try {
      data = await getRequestBody(req);
    } catch {
      sendError(res, 400, 'بيانات الطلب غير صالحة.', 'Invalid request body.');
      return;
    }

    if (!teachers.some(t => t.teacherId === data.teacherId)) {
      sendError(res, 400, 'المعلم غير موجود.', 'Teacher not found.');
      return;
    }

    if (!isValidPassingMark(data.passingMark)) {
      sendError(
        res,
        400,
        'علامة النجاح يجب أن تكون أكبر من 0 ولا تتجاوز 100.',
        'Passing mark must be greater than 0 and at most 100.'
      );
      return;
    }

    assignment.teacherId = data.teacherId;
    assignment.passingMark = Number(data.passingMark);

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم تعديل مادة الشعبة بنجاح.',
      messageEn: 'Teacher assignment updated successfully.',
      data: toDto(assignment)
    });

    return;
  }


  // =====================================================
  // PATCH /api/teacherassignments/{assignmentId}/status?isActive=true
  // Activate / deactivate (Admin)
  // =====================================================

  if (
    req.method === 'PATCH' &&
    statusMatch
  ) {

    if (!canWrite) {
      sendEmpty(res, 403);
      return;
    }

    const assignment = findAssignment(Number(statusMatch[1]));

    if (!assignment) {
      sendNotFound(res);
      return;
    }

    const isActive = readBoolean(url.searchParams.get('isActive'));

    if (!isActive.ok || isActive.value === undefined) {
      sendError(
        res,
        400,
        'قيمة الحالة غير صالحة.',
        'Invalid active status.'
      );
      return;
    }

    assignment.isActive = isActive.value;

    sendJson(res, 200, {
      success: true,
      messageAr: assignment.isActive
        ? 'تم تفعيل المادة للشعبة بنجاح.'
        : 'تم إلغاء تفعيل المادة للشعبة بنجاح.',
      messageEn: assignment.isActive
        ? 'Teacher assignment activated successfully.'
        : 'Teacher assignment deactivated successfully.',
      data: toDto(assignment)
    });

    return;
  }


  // =====================================================
  // Any other method / path under /api/teacherassignments
  // =====================================================

  sendError(
    res,
    404,
    'المسار غير موجود.',
    'Endpoint not found.'
  );
}


module.exports = teacherAssignmentsRoutes;