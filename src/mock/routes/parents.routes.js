const { parents, parentStudents } = require('../data/parents');
const students = require('../data/students');
const teachers = require('../data/teachers');
const users = require('../data/users');
const schoolClasses = require('../data/school-classes');
const sections = require('../data/sections');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every parents response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Roles that can read parents (list and single parent):
// 0 = Admin, 1 = Assistant Principal.
const READ_ROLES = [0, 1];

// Roles that can add, edit, activate / deactivate parents
// and link / unlink children: 0 = Admin only.
const WRITE_ROLES = [0];

const PARENT_ROLE = 4;

const FATHER = 0;
const MOTHER = 1;
const RELATIONSHIPS = [0, 1, 2];

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

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
// 1. The search matches the names, the login ID and the phone
//    number (contains, small and capital letters are the same).
// 2. The text of the messages is not the real text, except the ones
//    written in the API Reference ("Relationship is required.",
//    "Invalid relationship.", "Parent not found.").
// 3. The login ID must be different from every parent, teacher,
//    student and user in data/users.js.
// 4. DELETE .../students/{studentId} answers with the updated parent
//    (the API Reference does not say what it returns).
// 5. The mock does not create a login account for a new parent,
//    and deactivating a parent does not block any login.
//    (Login uses data/users.js only.)


// =====================================================
// Helpers
// =====================================================

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode);
  res.end(JSON.stringify(body));
}


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


function sendSuccess(res, statusCode, messageAr, messageEn, data) {
  sendJson(res, statusCode, {
    success: true,
    messageAr,
    messageEn,
    data
  });
}


function sendParentNotFound(res) {
  sendError(res, 404, 'ولي الأمر غير موجود.', 'Parent not found.');
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
function getCurrentUser(req) {

  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : '';

  return users.find(user => user.token === token) || null;
}


function clean(value) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';
}


function getMissingFields(data, fields) {
  return fields
    .filter(field => !clean(data[field]))
    .map(field => `${field} is required.`);
}


function isLoginIdUsed(loginId, exceptUserId = null) {

  const value = loginId.toLowerCase();

  const sameLoginId = item =>
    item.userId !== exceptUserId &&
    String(item.loginId).toLowerCase() === value;

  return (
    parents.some(sameLoginId) ||
    teachers.some(sameLoginId) ||
    students.some(sameLoginId) ||
    users.some(sameLoginId)
  );
}


function findParent(parentId) {
  return parents.find(parent => parent.parentId === parentId);
}


function findStudent(studentId) {
  return students.find(student => student.studentId === studentId);
}


function fullName(person, lang) {
  const suffix = lang === 'ar' ? 'Ar' : 'En';

  return [
    person[`firstName${suffix}`],
    person[`fatherName${suffix}`],
    person[`grandFatherName${suffix}`],
    person[`familyName${suffix}`]
  ]
    .filter(Boolean)
    .join(' ');
}


// The parent who is already the father (0) or mother (1) of the student.
function findTakenParent(studentId, relationship) {

  const link = parentStudents.find(
    item =>
      item.studentId === studentId &&
      item.relationship === relationship
  );

  return link ? findParent(link.parentId) : null;
}


// One child as it appears in ParentDto.children.
function toChildDto(link) {

  const student = findStudent(link.studentId);

  if (!student) {
    return null;
  }

  const schoolClass = schoolClasses.find(
    item => item.schoolClassId === student.classId
  );

  const section = sections.find(
    item => item.sectionId === student.sectionId
  );

  return {
    studentId: student.studentId,
    studentNumber: student.studentNumber,

    firstNameAr: student.firstNameAr,
    fatherNameAr: student.fatherNameAr,
    grandFatherNameAr: student.grandFatherNameAr,
    familyNameAr: student.familyNameAr,

    firstNameEn: student.firstNameEn,
    fatherNameEn: student.fatherNameEn,
    grandFatherNameEn: student.grandFatherNameEn,
    familyNameEn: student.familyNameEn,

    classId: student.classId,
    classNameAr: schoolClass ? schoolClass.classNameAr : null,
    classNameEn: schoolClass ? schoolClass.classNameEn : null,

    sectionId: student.sectionId,
    sectionAr: section ? section.sectionAr : null,
    sectionEn: section ? section.sectionEn : null,

    relationship: link.relationship,
    isActive: student.isActive,
    studentStatus: student.studentStatus
  };
}


// ParentDto: the parent + their children, sorted by student number.
function toParentDto(parent) {

  const children = parentStudents
    .filter(link => link.parentId === parent.parentId)
    .map(toChildDto)
    .filter(Boolean)
    .sort((a, b) => String(a.studentNumber).localeCompare(String(b.studentNumber)));

  return {
    ...parent,
    children
  };
}


function matchesSearch(parent, searchValue) {

  const values = [
    parent.loginId,
    parent.phoneNumber,
    fullName(parent, 'ar'),
    fullName(parent, 'en')
  ];

  return values.some(
    value => String(value).toLowerCase().includes(searchValue)
  );
}


// Checks the children of a new parent, or one child being linked.
// Returns null when everything is fine, or the error to send.
// existingParentId: the parent the child is linked to (null when creating).
function checkChildren(children, existingParentId = null) {

  if (!Array.isArray(children)) {
    return ['قائمة الأبناء غير صالحة.', 'Children must be a list.'];
  }

  const seen = new Set();

  for (let index = 0; index < children.length; index++) {

    const child = children[index] || {};
    const studentId = Number(child.studentId);
    const relationship = child.relationship;

    const student = findStudent(studentId);

    if (!student) {
      return ['الطالب غير موجود.', 'Student not found.'];
    }

    if (seen.has(studentId)) {
      return [
        'تم إرسال نفس الطالب أكثر من مرة.',
        'The same student was sent more than once.'
      ];
    }

    seen.add(studentId);

    if (relationship === undefined || relationship === null) {
      return ['صلة القرابة مطلوبة.', 'Relationship is required.'];
    }

    if (!RELATIONSHIPS.includes(relationship)) {
      return ['صلة القرابة غير صالحة.', 'Invalid relationship.'];
    }

    if (
      existingParentId !== null &&
      parentStudents.some(
        link =>
          link.parentId === existingParentId &&
          link.studentId === studentId
      )
    ) {
      return [
        'الطالب مرتبط بولي الأمر هذا بالفعل.',
        'The student is already linked to this parent.'
      ];
    }

    if (relationship === FATHER && findTakenParent(studentId, FATHER)) {
      return [
        `للطالب ${fullName(student, 'ar')} أب مرتبط بالفعل.`,
        `${fullName(student, 'en')} already has a father linked.`
      ];
    }

    if (relationship === MOTHER && findTakenParent(studentId, MOTHER)) {
      return [
        `للطالب ${fullName(student, 'ar')} أم مرتبطة بالفعل.`,
        `${fullName(student, 'en')} already has a mother linked.`
      ];
    }
  }

  return null;
}


// =====================================================
// Parents Routes
// =====================================================

function parentsRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  const pathname = url.pathname.toLowerCase();

  if (
    pathname !== '/api/parents' &&
    !pathname.startsWith('/api/parents/')
  ) {
    return false;
  }

  const run = () =>
    handleParents(req, res, url, pathname)
      .catch(error => {
        console.error('Parents mock error:', error);
        sendError(res, 500, 'حدث خطأ غير متوقع.', 'An unexpected error occurred.');
      });

  if (DELAY_MS > 0) {
    setTimeout(run, DELAY_MS);
  } else {
    run();
  }

  return true;
}


async function handleParents(req, res, url, pathname) {

  const currentUser = getCurrentUser(req);

  if (!currentUser) {
    sendEmpty(res, 401);
    return;
  }

  const canRead = READ_ROLES.includes(currentUser.role);
  const canWrite = WRITE_ROLES.includes(currentUser.role);

  const parentIdMatch = pathname.match(/^\/api\/parents\/(\d+)$/);
  const statusMatch = pathname.match(/^\/api\/parents\/(\d+)\/status$/);
  const linkMatch = pathname.match(/^\/api\/parents\/(\d+)\/students$/);
  const unlinkMatch = pathname.match(/^\/api\/parents\/(\d+)\/students\/(\d+)$/);


  // =====================================================
  // GET /api/parents/me (Parent)
  // =====================================================

  if (req.method === 'GET' && pathname === '/api/parents/me') {

    if (currentUser.role !== PARENT_ROLE) {
      sendEmpty(res, 403);
      return;
    }

    const parent = parents.find(item => item.userId === currentUser.userId);

    if (!parent) {
      sendParentNotFound(res);
      return;
    }

    sendSuccess(res, 200, 'تم جلب بيانات ولي الأمر بنجاح', 'Parent retrieved successfully', toParentDto(parent));
    return;
  }


  // =====================================================
  // GET /api/parents
  // Paged list: search, isActive, studentId (Admin, Assistant Principal)
  // =====================================================

  if (req.method === 'GET' && pathname === '/api/parents') {

    if (!canRead) {
      sendEmpty(res, 403);
      return;
    }

    const pageNumber = Math.max(
      Number(url.searchParams.get('pageNumber')) || 1,
      1
    );

    const pageSize = Math.min(
      Math.max(
        Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE,
        1
      ),
      MAX_PAGE_SIZE
    );

    const search = url.searchParams.get('search');
    const isActive = url.searchParams.get('isActive');
    const studentId = url.searchParams.get('studentId');

    let filtered = [...parents].sort((a, b) => a.parentId - b.parentId);

    if (search && search.trim()) {
      const searchValue = search.toLowerCase().trim();
      filtered = filtered.filter(parent => matchesSearch(parent, searchValue));
    }

    if (isActive === 'true' || isActive === 'false') {
      const active = isActive === 'true';
      filtered = filtered.filter(parent => parent.isActive === active);
    }

    if (studentId) {
      const id = Number(studentId);
      const linkedIds = parentStudents
        .filter(link => link.studentId === id)
        .map(link => link.parentId);

      filtered = filtered.filter(parent => linkedIds.includes(parent.parentId));
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;

    const items = filtered
      .slice(startIndex, startIndex + pageSize)
      .map(toParentDto);

    sendSuccess(res, 200, 'تم جلب أولياء الأمور بنجاح', 'Parents retrieved successfully', {
      items,
      totalCount,
      pageNumber,
      pageSize,
      totalPages
    });

    return;
  }


  // =====================================================
  // GET /api/parents/{parentId} (Admin, Assistant Principal)
  // =====================================================

  if (req.method === 'GET' && parentIdMatch) {

    if (!canRead) {
      sendEmpty(res, 403);
      return;
    }

    const parent = findParent(Number(parentIdMatch[1]));

    if (!parent) {
      sendParentNotFound(res);
      return;
    }

    sendSuccess(res, 200, 'تم جلب بيانات ولي الأمر بنجاح', 'Parent retrieved successfully', toParentDto(parent));
    return;
  }


  // Every request below is a write: Admin only.
  if (!canWrite) {
    sendEmpty(res, 403);
    return;
  }


  // =====================================================
  // POST /api/parents (Admin)
  // The account + the children. Every child is checked first:
  // any problem → 400 and nothing is created.
  // =====================================================

  if (req.method === 'POST' && pathname === '/api/parents') {

    const data = await getRequestBody(req);

    const missing = getMissingFields(data, CREATE_FIELDS);

    if (missing.length > 0) {
      sendError(
        res,
        400,
        `فشل التحقق: ${missing.join(' ')}`,
        `Validation failed: ${missing.join(' ')}`,
        missing
      );
      return;
    }

    if (clean(data.temporaryPassword).length < 8) {
      sendError(
        res,
        400,
        'فشل التحقق: يجب أن تكون كلمة المرور المؤقتة بين 8 و100 حرف.',
        'Validation failed: Temporary password must be between 8 and 100 characters.'
      );
      return;
    }

    if (isLoginIdUsed(clean(data.loginId))) {
      sendError(res, 400, 'اسم الدخول هذا مستخدم من قبل مستخدم آخر.', 'This login ID is already used by another user.');
      return;
    }

    const children = data.children ?? [];
    const childError = checkChildren(children);

    if (childError) {
      sendError(res, 400, childError[0], childError[1]);
      return;
    }

    const parentId = Math.max(0, ...parents.map(p => p.parentId)) + 1;

    const parent = {
      parentId,
      userId: 200 + parentId,
      isActive: true,
      mustChangePassword: true,
      role: PARENT_ROLE
    };

    for (const field of UPDATE_FIELDS) {
      parent[field] = clean(data[field]);
    }

    parents.push(parent);

    for (const child of children) {
      parentStudents.push({
        parentId,
        studentId: Number(child.studentId),
        relationship: child.relationship
      });
    }

    sendSuccess(res, 201, 'تمت إضافة ولي الأمر بنجاح.', 'The parent was added successfully.', toParentDto(parent));
    return;
  }


  // =====================================================
  // PUT /api/parents/{parentId} (Admin)
  // =====================================================

  if (req.method === 'PUT' && parentIdMatch) {

    const parent = findParent(Number(parentIdMatch[1]));

    if (!parent) {
      sendParentNotFound(res);
      return;
    }

    const data = await getRequestBody(req);

    const missing = getMissingFields(data, UPDATE_FIELDS);

    if (missing.length > 0) {
      sendError(
        res,
        400,
        `فشل التحقق: ${missing.join(' ')}`,
        `Validation failed: ${missing.join(' ')}`,
        missing
      );
      return;
    }

    if (isLoginIdUsed(clean(data.loginId), parent.userId)) {
      sendError(res, 400, 'اسم الدخول هذا مستخدم من قبل مستخدم آخر.', 'This login ID is already used by another user.');
      return;
    }

    for (const field of UPDATE_FIELDS) {
      parent[field] = clean(data[field]);
    }

    sendSuccess(res, 200, 'تم تعديل بيانات ولي الأمر بنجاح.', 'The parent was updated successfully.', toParentDto(parent));
    return;
  }


  // =====================================================
  // PATCH /api/parents/{parentId}/status?isActive= (Admin)
  // =====================================================

  if (req.method === 'PATCH' && statusMatch) {

    const parent = findParent(Number(statusMatch[1]));

    if (!parent) {
      sendParentNotFound(res);
      return;
    }

    const isActive = url.searchParams.get('isActive');

    if (isActive !== 'true' && isActive !== 'false') {
      sendError(res, 400, 'قيمة حالة الحساب غير صالحة.', 'Invalid account status.');
      return;
    }

    parent.isActive = isActive === 'true';

    sendSuccess(
      res,
      200,
      parent.isActive ? 'تم تفعيل حساب ولي الأمر.' : 'تم تعطيل حساب ولي الأمر.',
      parent.isActive ? 'The parent account was activated.' : 'The parent account was deactivated.',
      toParentDto(parent)
    );
    return;
  }


  // =====================================================
  // POST /api/parents/{parentId}/students (Admin)
  // Body: { studentId, relationship }
  // =====================================================

  if (req.method === 'POST' && linkMatch) {

    const parent = findParent(Number(linkMatch[1]));

    if (!parent) {
      sendParentNotFound(res);
      return;
    }

    const data = await getRequestBody(req);

    const childError = checkChildren([data], parent.parentId);

    if (childError) {
      sendError(res, 400, childError[0], childError[1]);
      return;
    }

    parentStudents.push({
      parentId: parent.parentId,
      studentId: Number(data.studentId),
      relationship: data.relationship
    });

    sendSuccess(res, 200, 'تم ربط الطالب بولي الأمر بنجاح.', 'The student was linked to the parent successfully.', toParentDto(parent));
    return;
  }


  // =====================================================
  // DELETE /api/parents/{parentId}/students/{studentId} (Admin)
  // =====================================================

  if (req.method === 'DELETE' && unlinkMatch) {

    const parent = findParent(Number(unlinkMatch[1]));

    if (!parent) {
      sendParentNotFound(res);
      return;
    }

    const studentId = Number(unlinkMatch[2]);

    const index = parentStudents.findIndex(
      link =>
        link.parentId === parent.parentId &&
        link.studentId === studentId
    );

    if (index === -1) {
      sendError(res, 400, 'الطالب غير مرتبط بولي الأمر هذا.', 'The student is not linked to this parent.');
      return;
    }

    parentStudents.splice(index, 1);

    sendSuccess(res, 200, 'تم إلغاء ربط الطالب بولي الأمر.', 'The student was unlinked from the parent.', toParentDto(parent));
    return;
  }


  sendError(res, 404, 'المسار غير موجود.', 'Endpoint not found.');
}


module.exports = parentsRoutes;
