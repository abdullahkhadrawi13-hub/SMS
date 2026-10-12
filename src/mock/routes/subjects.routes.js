const subjects = require('../data/subjects');
const users = require('../data/users');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every subjects response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Roles that can read subjects (list and single subject):
// 0 = Admin, 1 = Assistant Principal. A teacher gets 403.
const READ_ROLES = [0, 1];

// Roles that can add, edit, activate or deactivate subjects:
// 0 = Admin only.
const WRITE_ROLES = [0];

// Fields required when adding or editing a subject.
const FIELDS = ['subjectAr', 'subjectEn'];


// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// Change them when the real API rules are known.
// =====================================================
//
// 1. GET /api/subjects returns every subject (active and inactive)
//    as an unpaged array, sorted by subjectId. The API Reference
//    does not show this response; the shape is { subjectId,
//    subjectAr, subjectEn, isActive }.
// 2. A missing field is rejected with 400 and "data" is a list
//    of messages, one per missing field.
// 3. Subject names are unique (SMS Final Specification, section 19).
//    Small and capital letters are treated as the same.
//    The real text of the "name already used" message is not known.
// 4. The text of the success messages is not the real text.
// 5. Deactivating a subject does not change the assignments
//    that already use it (the real rule is not documented).


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
    'المادة غير موجودة.',
    'Subject not found.'
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


function findSubject(subjectId) {
  return subjects.find(
    subject => subject.subjectId === subjectId
  );
}


// Text fields are saved without spaces at the start or the end.
function clean(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}


// Returns one message for every required field that is missing.
function getMissingFields(data) {
  return FIELDS
    .filter(field => !clean(data[field]))
    .map(field => `${field} is required.`);
}


// True when another subject already has this Arabic or English name.
// exceptSubjectId: the subject that is being edited (allowed to keep its names).
function isNameUsed(data, exceptSubjectId = null) {

  const nameAr = clean(data.subjectAr).toLowerCase();
  const nameEn = clean(data.subjectEn).toLowerCase();

  return subjects.some(
    subject =>
      subject.subjectId !== exceptSubjectId &&
      (
        subject.subjectAr.toLowerCase() === nameAr ||
        subject.subjectEn.toLowerCase() === nameEn
      )
  );
}


// Checks the body of POST and PUT.
// Returns true when the request was answered with an error.
function rejectInvalidBody(res, data, exceptSubjectId = null) {

  const missing = getMissingFields(data);

  if (missing.length > 0) {

    sendError(
      res,
      400,
      'يرجى تعبئة جميع الحقول المطلوبة.',
      'All required fields must be provided.',
      missing
    );

    return true;
  }

  if (isNameUsed(data, exceptSubjectId)) {

    sendError(
      res,
      400,
      'اسم المادة مستخدم مسبقًا.',
      'The subject name is already used.'
    );

    return true;
  }

  return false;
}


// =====================================================
// Subjects Routes
// =====================================================

function subjectsRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  // The path is compared in small letters so /api/Subjects works too.
  const pathname = url.pathname.toLowerCase();

  if (
    pathname !== '/api/subjects' &&
    !pathname.startsWith('/api/subjects/')
  ) {
    return false;
  }


  if (DELAY_MS > 0) {

    setTimeout(
      () => handleSubjects(req, res, url, pathname),
      DELAY_MS
    );

  } else {

    handleSubjects(req, res, url, pathname);
  }

  return true;
}


async function handleSubjects(req, res, url, pathname) {

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


  // /api/subjects/{subjectId}
  const subjectIdMatch = pathname.match(
    /^\/api\/subjects\/(\d+)$/
  );

  // /api/subjects/{subjectId}/status
  const statusMatch = pathname.match(
    /^\/api\/subjects\/(\d+)\/status$/
  );


  // =====================================================
  // GET /api/subjects
  // Every subject (Admin, Assistant Principal)
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/subjects'
  ) {

    if (!canRead) {
      sendEmpty(res, 403);
      return;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب المواد بنجاح',
      messageEn: 'Subjects retrieved successfully',
      data: [...subjects].sort((a, b) => a.subjectId - b.subjectId)
    });

    return;
  }


  // =====================================================
  // GET /api/subjects/{subjectId}
  // One subject (Admin, Assistant Principal)
  // =====================================================

  if (
    req.method === 'GET' &&
    subjectIdMatch
  ) {

    if (!canRead) {
      sendEmpty(res, 403);
      return;
    }

    const subject =
      findSubject(Number(subjectIdMatch[1]));

    if (!subject) {
      sendNotFound(res);
      return;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب بيانات المادة بنجاح',
      messageEn: 'Subject retrieved successfully',
      data: subject
    });

    return;
  }


  // =====================================================
  // POST /api/subjects
  // Create subject (Admin)
  // =====================================================

  if (
    req.method === 'POST' &&
    pathname === '/api/subjects'
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

    if (rejectInvalidBody(res, data)) {
      return;
    }

    const subject = {
      subjectId: Math.max(0, ...subjects.map(s => s.subjectId)) + 1,
      subjectAr: clean(data.subjectAr),
      subjectEn: clean(data.subjectEn),
      isActive: true
    };

    subjects.push(subject);

    sendJson(res, 201, {
      success: true,
      messageAr: 'تمت إضافة المادة بنجاح.',
      messageEn: 'Subject created successfully.',
      data: subject
    });

    return;
  }


  // =====================================================
  // PUT /api/subjects/{subjectId}
  // Edit subject (Admin)
  // =====================================================

  if (
    req.method === 'PUT' &&
    subjectIdMatch
  ) {

    if (!canWrite) {
      sendEmpty(res, 403);
      return;
    }

    const subject =
      findSubject(Number(subjectIdMatch[1]));

    if (!subject) {
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

    if (rejectInvalidBody(res, data, subject.subjectId)) {
      return;
    }

    subject.subjectAr = clean(data.subjectAr);
    subject.subjectEn = clean(data.subjectEn);

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم تعديل المادة بنجاح.',
      messageEn: 'Subject updated successfully.',
      data: subject
    });

    return;
  }


  // =====================================================
  // PATCH /api/subjects/{subjectId}/status?isActive=true
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

    const subject =
      findSubject(Number(statusMatch[1]));

    if (!subject) {
      sendNotFound(res);
      return;
    }

    const isActive =
      url.searchParams.get('isActive');

    if (
      isActive !== 'true' &&
      isActive !== 'false'
    ) {

      sendError(
        res,
        400,
        'قيمة حالة المادة غير صالحة.',
        'Invalid subject active status.'
      );

      return;
    }

    subject.isActive = isActive === 'true';

    sendJson(res, 200, {
      success: true,
      messageAr: subject.isActive
        ? 'تم تفعيل المادة بنجاح.'
        : 'تم إلغاء تفعيل المادة بنجاح.',
      messageEn: subject.isActive
        ? 'Subject activated successfully.'
        : 'Subject deactivated successfully.',
      data: subject
    });

    return;
  }


  // =====================================================
  // Any other method / path under /api/subjects
  // =====================================================

  sendError(
    res,
    404,
    'المسار غير موجود.',
    'Endpoint not found.'
  );
}


module.exports = subjectsRoutes;
