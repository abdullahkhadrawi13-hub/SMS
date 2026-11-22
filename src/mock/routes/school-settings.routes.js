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
// 1. Every endpoint is Admin only, except GET /api/schoolsettings/school.
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
// 7. GET  /api/schoolsettings/school: every signed-in user (PR #51).
// 8. PUT  /api/schoolsettings/school: Admin only. Every field each time;
//    see validateSchoolInfo() for the rules. Returns the saved information.
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


// The validation error shape: messageEn starts with "Validation failed:",
// and data lists the English field messages.
function sendValidationError(res, fieldMessages) {
  sendError(
    res,
    400,
    `فشل التحقق: ${fieldMessages.join(' ')}`,
    `Validation failed: ${fieldMessages.join(' ')}`,
    fieldMessages
  );
}


// Spaces removed at the start and end, one space between words
// (the backend saves text the same way).
function cleanText(value) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : value;
}


// PUT /api/schoolsettings/school rules (API Reference, section 12):
// names required, at most 100; phone optional (null to clear; "" is
// invalid), at most 20, a phone number; address optional, at most 200
// ("" or spaces → null); weeklyDaysOff required, 0–6, not all 7.
function validateSchoolInfo(body) {

  const fieldErrors = [];

  const schoolNameAr = cleanText(body.schoolNameAr);
  const schoolNameEn = cleanText(body.schoolNameEn);

  if (!schoolNameAr) {
    fieldErrors.push('School name in Arabic is required.');
  } else if (schoolNameAr.length > 100) {
    fieldErrors.push('School name in Arabic cannot exceed 100 characters.');
  }

  if (!schoolNameEn) {
    fieldErrors.push('School name in English is required.');
  } else if (schoolNameEn.length > 100) {
    fieldErrors.push('School name in English cannot exceed 100 characters.');
  }

  let phoneNumber = body.phoneNumber ?? null;

  if (phoneNumber !== null) {
    phoneNumber = cleanText(String(phoneNumber));

    if (phoneNumber.length > 20) {
      fieldErrors.push('Phone number cannot exceed 20 characters.');
    } else if (!/^\+?[0-9 -]{7,}$/.test(phoneNumber)) {
      // ASSUMPTION: the real backend's phone rule is not known exactly.
      fieldErrors.push('Invalid phone number.');
    }
  }

  let address = cleanText(body.address ?? '');

  if (address.length > 200) {
    fieldErrors.push('Address cannot exceed 200 characters.');
  }

  if (address === '') {
    address = null;
  }

  if (!Array.isArray(body.weeklyDaysOff)) {
    fieldErrors.push('weeklyDaysOff is required (send [] for no days off).');
  }

  if (fieldErrors.length) {
    return { fieldErrors };
  }

  const days = body.weeklyDaysOff;

  if (days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
    return {
      daysError: {
        ar: 'كل يوم عطلة يجب أن يكون رقمًا من 0 (الأحد) إلى 6 (السبت).',
        en: 'Each day off must be a number from 0 (Sunday) to 6 (Saturday).'
      }
    };
  }

  // A day sent twice counts once; always in order.
  const weeklyDaysOff = [...new Set(days)].sort((a, b) => a - b);

  if (weeklyDaysOff.length === 7) {
    return {
      daysError: {
        ar: 'لا يمكن أن تكون كل أيام الأسبوع عطلة.',
        en: 'Every day of the week cannot be a day off.'
      }
    };
  }

  return {
    school: { schoolNameAr, schoolNameEn, phoneNumber, address, weeklyDaysOff }
  };
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

  // =====================================================
  // GET /api/schoolsettings/school (PR #51)
  // The school information and weekly days off
  // (every signed-in user). PUT is below (Admin).
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/schoolsettings/school'
  ) {

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب معلومات المدرسة بنجاح.',
      messageEn: 'School information retrieved successfully.',
      data: { ...schoolSettings.school, weeklyDaysOff: [...schoolSettings.school.weeklyDaysOff] }
    });

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
  // PUT /api/schoolsettings/school (PR #51)
  // Save the school information: every field, every time
  // (Admin)
  // =====================================================

  if (
    req.method === 'PUT' &&
    pathname === '/api/schoolsettings/school'
  ) {

    let body;

    try {
      body = await readBody(req);
    } catch {
      sendError(res, 400, 'الطلب غير صالح.', 'Invalid request body.');
      return;
    }

    const result = validateSchoolInfo(body);

    if (result.fieldErrors) {
      sendValidationError(res, result.fieldErrors);
      return;
    }

    if (result.daysError) {
      sendError(res, 400, result.daysError.ar, result.daysError.en);
      return;
    }

    schoolSettings.school = result.school;

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم حفظ معلومات المدرسة بنجاح.',
      messageEn: 'School information saved successfully.',
      data: { ...result.school, weeklyDaysOff: [...result.school.weeklyDaysOff] }
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
