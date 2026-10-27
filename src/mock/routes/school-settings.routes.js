const schoolSettings = require('../data/school-settings');
const teachers = require('../data/teachers');
const users = require('../data/users');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every school settings response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Only the Admin (role 0) can read or change the school settings.
const ALLOWED_ROLES = [0];

// The limits of failedSubjectsToRepeat (API Reference, section 12).
const MIN_FAILED_SUBJECTS = 1;
const MAX_FAILED_SUBJECTS = 50;


// =====================================================
// RULES (SMS API Reference - section 12)
// =====================================================
//
// 1. Both endpoints are Admin only.
//    No token: 401. Any other role: 403. (Both without a body.)
// 2. GET  /api/schoolsettings/attendance-officer
//    "data" is the teacherId itself (a number), or null when
//    no officer is set. It is NOT an object.
// 3. PUT  /api/schoolsettings/attendance-officer/{teacherId}
//    The teacherId is in the URL. The request has no body.
//    Sets or replaces the officer: there is only one officer.
// 4. An inactive teacher cannot be the officer: 400
//    "An inactive teacher cannot be the attendance officer."
//    (SMS API Reference - section 5)
// 5. GET  /api/schoolsettings/promotion
//    data: { "failedSubjectsToRepeat": 1 } (default 1).
// 6. PUT  /api/schoolsettings/promotion
//    Body: { "failedSubjectsToRepeat": 2 }. The value must be between
//    1 and 50, otherwise 400 "Validation failed: Failed subjects to repeat
//    must be between 1 and 50." (a validation error: data is an array
//    of the field messages). Returns the saved value in data.
//    The rollover preview (rollover.routes.js) uses the new value at once.
//
// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// Change them when the real API rules are known.
// =====================================================
//
// 1. A teacherId that does not exist is rejected with 404
//    "Teacher not found.".
// 2. PUT returns the new teacherId in "data".
// 3. The text of the success messages is not the real text.
// 4. A decimal value (2.5) or a value that is not a number is rejected
//    with the same 400 as a value out of range.


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


function readBody(req) {

  return new Promise((resolve, reject) => {

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
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


// =====================================================
// School Settings Routes
// =====================================================

function schoolSettingsRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  // The frontend calls /api/schoolsettings (small letters).
  // The path is compared in small letters so both forms work.
  const pathname = url.pathname.toLowerCase();


  // =====================================================
  // Only handle School Settings API
  // =====================================================

  if (
    pathname !== '/api/schoolsettings' &&
    !pathname.startsWith('/api/schoolsettings/')
  ) {
    return false;
  }


  if (DELAY_MS > 0) {

    setTimeout(
      () => handleSchoolSettings(req, res, pathname),
      DELAY_MS
    );

  } else {

    handleSchoolSettings(req, res, pathname);
  }

  return true;
}


async function handleSchoolSettings(req, res, pathname) {

  // =====================================================
  // Current user (from the token)
  // =====================================================

  const currentUser = getCurrentUser(req);

  if (!currentUser) {
    sendEmpty(res, 401);
    return;
  }

  if (!ALLOWED_ROLES.includes(currentUser.role)) {
    sendEmpty(res, 403);
    return;
  }


  // /api/schoolsettings/attendance-officer/{teacherId}
  const setOfficerMatch = pathname.match(
    /^\/api\/schoolsettings\/attendance-officer\/(\d+)$/
  );


  // =====================================================
  // GET /api/schoolsettings/attendance-officer
  // The current attendance officer (teacherId or null)
  // (Admin)
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/schoolsettings/attendance-officer'
  ) {

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب مسؤول الحضور بنجاح',
      messageEn: 'Attendance officer retrieved successfully',

      // The teacherId itself, not an object.
      data: schoolSettings.attendanceOfficerTeacherId
    });

    return;
  }


  // =====================================================
  // PUT /api/schoolsettings/attendance-officer/{teacherId}
  // Set or replace the attendance officer (no body)
  // (Admin)
  // =====================================================

  if (
    req.method === 'PUT' &&
    setOfficerMatch
  ) {

    const teacherId = Number(setOfficerMatch[1]);

    const teacher = teachers.find(
      item => item.teacherId === teacherId
    );

    if (!teacher) {

      sendError(
        res,
        404,
        'المعلم غير موجود.',
        'Teacher not found.'
      );

      return;
    }

    if (!teacher.isActive) {

      sendError(
        res,
        400,
        'لا يمكن أن يكون المعلم غير النشط مسؤول الحضور.',
        'An inactive teacher cannot be the attendance officer.'
      );

      return;
    }


    // The old officer (if any) is replaced.
    schoolSettings.attendanceOfficerTeacherId = teacherId;


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم تعيين مسؤول الحضور بنجاح',
      messageEn: 'Attendance officer set successfully',
      data: teacherId
    });

    return;
  }


  // =====================================================
  // GET /api/schoolsettings/promotion
  // The rollover setting
  // (Admin)
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/schoolsettings/promotion'
  ) {

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب إعداد الترحيل بنجاح',
      messageEn: 'Promotion settings retrieved successfully',
      data: {
        failedSubjectsToRepeat: schoolSettings.failedSubjectsToRepeat
      }
    });

    return;
  }


  // =====================================================
  // PUT /api/schoolsettings/promotion
  // Change the rollover setting
  // Body: { "failedSubjectsToRepeat": 2 }
  // (Admin)
  // =====================================================

  if (
    req.method === 'PUT' &&
    pathname === '/api/schoolsettings/promotion'
  ) {

    let body;

    try {
      body = await readBody(req);
    } catch {
      sendError(res, 400, 'الطلب غير صالح.', 'Invalid request body.');
      return;
    }

    const value = body.failedSubjectsToRepeat;

    if (
      !Number.isInteger(value) ||
      value < MIN_FAILED_SUBJECTS ||
      value > MAX_FAILED_SUBJECTS
    ) {

      const fieldMessage =
        `Failed subjects to repeat must be between ${MIN_FAILED_SUBJECTS} and ${MAX_FAILED_SUBJECTS}.`;

      sendError(
        res,
        400,
        `فشل التحقق: يجب أن يكون عدد المواد الراسبة للإعادة بين ${MIN_FAILED_SUBJECTS} و${MAX_FAILED_SUBJECTS}.`,
        `Validation failed: ${fieldMessage}`,
        [fieldMessage]
      );

      return;
    }


    schoolSettings.failedSubjectsToRepeat = value;


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم حفظ إعداد الترحيل بنجاح',
      messageEn: 'Promotion settings saved successfully',
      data: {
        failedSubjectsToRepeat: value
      }
    });

    return;
  }


  // =====================================================
  // Unknown School Settings endpoint
  // =====================================================

  sendError(
    res,
    404,
    'نقطة النهاية غير موجودة',
    'School settings endpoint not found'
  );
}


module.exports = schoolSettingsRoutes;
