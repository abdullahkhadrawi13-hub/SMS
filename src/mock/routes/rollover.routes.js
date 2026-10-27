const students = require('../data/students');
const schoolClasses = require('../data/school-classes');
const sections = require('../data/sections');
const academicYears = require('../data/academic-years');
const academicTerms = require('../data/academic-terms');
const schoolSettings = require('../data/school-settings');
const users = require('../data/users');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every rollover response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Only the Admin (role 0) can preview or run a rollover.
const ALLOWED_ROLES = [0];

// The rule behind "Repeat" comes from the school settings
// (data/school-settings.js, changed by PUT /api/schoolsettings/promotion),
// and is read again on every preview.
function failedSubjectsToRepeat() {
  return schoolSettings.failedSubjectsToRepeat;
}

// 5 wrong admin passwords -> 429 (shared with the login in the real backend).
const MAX_WRONG_PASSWORDS = 5;


// =====================================================
// RULES (SMS API Reference - section 13)
// =====================================================
//
// 1. Admin only. No token: 401. Any other role: 403.
// 2. GET /api/rollover/preview?fromAcademicTermId={id} changes nothing.
//    400: no current term, source term not found, the source term is the
//    current term, or the source term is not before the current term.
// 3. Same year (term 1 -> term 2): suggestion 0 Copy, same class and section.
// 4. New year: 1 Promote (next class by level, section with the same name),
//    2 Repeat, 3 Graduate (graduation class), 4 NeedsDecision,
//    5 AlreadyPlaced, 6 NoTarget.
// 5. POST /api/rollover:
//    - adminPassword is required (400) and must be right (400, never 401);
//      5 wrong ones -> 429.
//    - new year: confirmYearName must match fromYearName (400), and every
//      term of the old year must have its grades closed (400).
//    - a new-year rollover closes every term of the old year for good
//      (gradesClosedByRollover = true). A same-year rollover closes nothing.
//    - sending it again is safe: everyone comes back as alreadyPlaced.
//
// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// Change them when the real API rules are known.
// =====================================================
//
// 1. The marks are not read from the grades mock: some students get
//    example results by their id (every 17th fails two subjects, every
//    19th fails three, every 11th fails one, every 13th has a missing
//    mark), so every suggestion can be seen, and changing the rule
//    (failedSubjectsToRepeat) changes who is suggested to repeat.
// 2. The terms in data/academic-terms.js say the old years were already
//    rolled over. The mock ignores that, so the rollover can be tried;
//    who it moved is kept in memory until the mock server restarts.
// 3. missingGradeSubjects has the same shape as failedSubjects without
//    the numbers (the API Reference only shows []).
// 4. The text of the messages is not always the real text.


// =====================================================
// Helpers
// =====================================================

// "currentTermId:studentId" of every student already moved.
const placed = new Set();

// Wrong admin passwords per userId.
const wrongPasswords = new Map();


function sendJson(res, statusCode, body) {
  res.writeHead(statusCode);
  res.end(JSON.stringify(body));
}


function sendError(res, statusCode, messageAr, messageEn, data = null) {
  sendJson(res, statusCode, {
    success: false,
    messageAr,
    messageEn,
    data
  });
}


function sendDenied(res, statusCode) {
  if (statusCode === 401) {
    sendError(res, 401, 'يجب تسجيل الدخول.', 'You must log in.');
  } else {
    sendError(res, 403, 'ليس لديك صلاحية.', 'You do not have permission.');
  }
}


function getCurrentUser(req) {

  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : '';

  return users.find(user => user.token === token) || null;
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


function fullName(student, lang) {
  return lang === 'ar'
    ? [student.firstNameAr, student.fatherNameAr, student.grandFatherNameAr, student.familyNameAr].join(' ')
    : [student.firstNameEn, student.fatherNameEn, student.grandFatherNameEn, student.familyNameEn].join(' ');
}


function yearOf(term) {
  return academicYears.find(year => year.academicYearId === term.academicYearId);
}


// Checks the source term. Returns { error } or { fromTerm, currentTerm }.
function checkTerms(fromAcademicTermId) {

  const currentTerm = academicTerms.find(term => term.isCurrent);

  if (!currentTerm) {
    return { error: ['لا يوجد فصل حالي.', 'No current academic term is configured.'] };
  }

  const fromTerm = academicTerms.find(term => term.academicTermId === fromAcademicTermId);

  if (!fromTerm) {
    return { error: ['الفصل المصدر غير موجود.', 'Source term not found.'] };
  }

  if (fromTerm.academicTermId === currentTerm.academicTermId) {
    return {
      error: [
        'الفصل المصدر هو الفصل الحالي. اختر الفصل السابق.',
        'The source term is the current term. Choose the previous term.'
      ]
    };
  }

  if (fromTerm.startDate >= currentTerm.startDate) {
    return {
      error: [
        'يجب أن يكون الفصل المصدر قبل الفصل الحالي.',
        'The source term must be before the current term.'
      ]
    };
  }

  return { fromTerm, currentTerm };
}


// Example results by id (see ASSUMPTIONS 1).
function exampleResult(studentId) {

  if (studentId % 19 === 0) {
    return {
      failed: [
        { subjectId: 1, subjectAr: 'الرياضيات', subjectEn: 'Mathematics', average: 38, passingMark: 50 },
        { subjectId: 2, subjectAr: 'العلوم', subjectEn: 'Science', average: 44, passingMark: 50 },
        { subjectId: 3, subjectAr: 'اللغة الإنجليزية', subjectEn: 'English', average: 47.5, passingMark: 50 }
      ],
      missing: []
    };
  }

  if (studentId % 17 === 0) {
    return {
      failed: [
        { subjectId: 1, subjectAr: 'الرياضيات', subjectEn: 'Mathematics', average: 42, passingMark: 50 },
        { subjectId: 2, subjectAr: 'العلوم', subjectEn: 'Science', average: 45.5, passingMark: 50 }
      ],
      missing: []
    };
  }

  if (studentId % 11 === 0) {
    return {
      failed: [{ subjectId: 1, subjectAr: 'الرياضيات', subjectEn: 'Mathematics', average: 41.5, passingMark: 50 }],
      missing: []
    };
  }

  if (studentId % 13 === 0) {
    return {
      failed: [],
      missing: [{ subjectId: 3, subjectAr: 'اللغة الإنجليزية', subjectEn: 'English' }]
    };
  }

  return { failed: [], missing: [] };
}


// The preview item of one student.
function buildItem(student, isNewYear, currentTerm) {

  const fromClass = schoolClasses.find(item => item.schoolClassId === student.classId);
  const fromSection = sections.find(item => item.sectionId === student.sectionId);

  const item = {
    studentId: student.studentId,
    studentNumber: student.studentNumber,
    studentNameAr: fullName(student, 'ar'),
    studentNameEn: fullName(student, 'en'),

    fromClassId: student.classId,
    fromClassNameAr: fromClass?.classNameAr ?? '',
    fromClassNameEn: fromClass?.classNameEn ?? '',
    fromSectionId: student.sectionId,
    fromSectionAr: fromSection?.sectionAr ?? '',
    fromSectionEn: fromSection?.sectionEn ?? '',

    targetClassId: null,
    targetClassNameAr: null,
    targetClassNameEn: null,
    targetSectionId: null,
    targetSectionAr: null,
    targetSectionEn: null,

    suggestion: 0,
    failedSubjects: [],
    missingGradeSubjects: [],
    noteAr: '',
    noteEn: ''
  };

  const setTarget = (schoolClass, section) => {
    item.targetClassId = schoolClass.schoolClassId;
    item.targetClassNameAr = schoolClass.classNameAr;
    item.targetClassNameEn = schoolClass.classNameEn;
    item.targetSectionId = section.sectionId;
    item.targetSectionAr = section.sectionAr;
    item.targetSectionEn = section.sectionEn;
  };

  // Already moved by an earlier rollover into the current term.
  if (placed.has(`${currentTerm.academicTermId}:${student.studentId}`)) {
    item.suggestion = 5;
    setTarget(fromClass, fromSection);
    return item;
  }

  // Same year: same class and same section.
  if (!isNewYear) {

    if (!fromSection || !fromSection.isActive) {
      item.suggestion = 6;
      item.noteAr = 'الشعبة غير فعّالة.';
      item.noteEn = 'The section is inactive.';
      return item;
    }

    item.suggestion = 0;
    setTarget(fromClass, fromSection);
    return item;
  }

  const result = exampleResult(student.studentId);

  item.failedSubjects = result.failed;
  item.missingGradeSubjects = result.missing;

  // Graduation class: no next class.
  if (fromClass?.isGraduationGrade) {
    item.suggestion = result.failed.length >= failedSubjectsToRepeat()
      ? 2
      : result.missing.length > 0 ? 4 : 3;

    if (item.suggestion === 4) {
      item.noteAr = 'علامات ناقصة: قرّر بنفسك.';
      item.noteEn = 'Missing marks: decide yourself.';
    }

    return item;
  }

  // The next active class by level, and the section with the same name.
  const nextClass = schoolClasses
    .filter(item2 => item2.isActive && item2.level > (fromClass?.level ?? 0))
    .sort((a, b) => a.level - b.level)[0];

  const nextSection = nextClass && sections.find(item2 =>
    item2.classId === nextClass.schoolClassId &&
    item2.isActive &&
    item2.sectionEn === fromSection?.sectionEn
  );

  if (!nextClass || !nextSection) {
    item.suggestion = 6;
    item.noteAr = `لا توجد شعبة ${fromSection?.sectionAr ?? ''} فعّالة في الصف التالي.`;
    item.noteEn = `There is no active section ${fromSection?.sectionEn ?? ''} in the next class.`;
    return item;
  }

  setTarget(nextClass, nextSection);

  if (result.failed.length >= failedSubjectsToRepeat()) {
    item.suggestion = 2;
  } else if (result.missing.length > 0) {
    item.suggestion = 4;
    item.noteAr = 'علامات ناقصة: قرّر بنفسك.';
    item.noteEn = 'Missing marks: decide yourself.';
  } else {
    item.suggestion = 1;
  }

  return item;
}


function buildPreview(fromTerm, currentTerm) {

  const isNewYear = fromTerm.academicYearId !== currentTerm.academicYearId;

  const fromYear = yearOf(fromTerm);

  const openTerms = isNewYear
    ? academicTerms
        .filter(term =>
          term.academicYearId === fromTerm.academicYearId &&
          !term.areGradesClosed
        )
        .map(term => ({
          academicTermId: term.academicTermId,
          nameAr: term.nameAr,
          nameEn: term.nameEn
        }))
    : [];

  return {
    fromAcademicTermId: fromTerm.academicTermId,
    fromTermNameAr: fromTerm.nameAr,
    fromTermNameEn: fromTerm.nameEn,

    toAcademicTermId: currentTerm.academicTermId,
    toTermNameAr: currentTerm.nameAr,
    toTermNameEn: currentTerm.nameEn,

    isNewYear,
    failedSubjectsToRepeat: failedSubjectsToRepeat(),
    willCloseGrades: isNewYear,
    fromYearName: isNewYear ? fromYear?.yearName ?? null : null,
    openTerms,

    students: students
      .filter(student => student.studentStatus === 0)
      .map(student => buildItem(student, isNewYear, currentTerm))
  };
}


// =====================================================
// Rollover Routes
// =====================================================

function rolloverRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:3000'}`
  );

  const pathname = url.pathname.toLowerCase();

  if (
    pathname !== '/api/rollover' &&
    !pathname.startsWith('/api/rollover/')
  ) {
    return false;
  }

  if (DELAY_MS > 0) {
    setTimeout(() => handleRollover(req, res, url, pathname), DELAY_MS);
  } else {
    handleRollover(req, res, url, pathname);
  }

  return true;
}


async function handleRollover(req, res, url, pathname) {

  const currentUser = getCurrentUser(req);

  if (!currentUser) {
    sendDenied(res, 401);
    return;
  }

  if (!ALLOWED_ROLES.includes(currentUser.role)) {
    sendDenied(res, 403);
    return;
  }


  // =====================================================
  // GET /api/rollover/preview?fromAcademicTermId={id}
  // =====================================================

  if (req.method === 'GET' && pathname === '/api/rollover/preview') {

    const check = checkTerms(Number(url.searchParams.get('fromAcademicTermId')));

    if (check.error) {
      sendError(res, 400, check.error[0], check.error[1]);
      return;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب المعاينة.',
      messageEn: 'Preview retrieved.',
      data: buildPreview(check.fromTerm, check.currentTerm)
    });

    return;
  }


  // =====================================================
  // POST /api/rollover
  // =====================================================

  if (req.method === 'POST' && pathname === '/api/rollover') {

    let body;

    try {
      body = await readBody(req);
    } catch {
      sendError(res, 400, 'الطلب غير صالح.', 'Invalid request body.');
      return;
    }

    // The admin's password, on every rollover.
    if ((wrongPasswords.get(currentUser.userId) ?? 0) >= MAX_WRONG_PASSWORDS) {
      sendError(
        res, 429,
        'محاولات كثيرة خاطئة. حاول بعد 5 دقائق.',
        'Too many failed login attempts. Try again in 5 minutes.'
      );
      return;
    }

    if (!body.adminPassword) {
      sendError(res, 400, 'كلمة مرور المسؤول مطلوبة.', 'Admin password is required.');
      return;
    }

    if (body.adminPassword !== currentUser.password) {
      wrongPasswords.set(currentUser.userId, (wrongPasswords.get(currentUser.userId) ?? 0) + 1);
      sendError(res, 400, 'كلمة مرور المسؤول غير صحيحة.', 'Admin password is incorrect.');
      return;
    }

    wrongPasswords.delete(currentUser.userId);

    const check = checkTerms(Number(body.fromAcademicTermId));

    if (check.error) {
      sendError(res, 400, check.error[0], check.error[1]);
      return;
    }

    const preview = buildPreview(check.fromTerm, check.currentTerm);

    if (preview.isNewYear) {

      if ((body.confirmYearName ?? '').trim() !== preview.fromYearName) {
        sendError(
          res, 400,
          `اكتب اسم السنة ${preview.fromYearName} كما هو لتأكيد الترحيل.`,
          `Type the year name ${preview.fromYearName} exactly to confirm the rollover.`
        );
        return;
      }

      if (preview.openTerms.length > 0) {
        sendError(
          res, 400,
          `لا يمكن ترحيل السنة قبل إغلاق علامات كل فصولها. فصول ما زالت مفتوحة: ${preview.openTerms.map(term => term.nameAr).join('، ')}`,
          `The year cannot be rolled over before every term's grades are closed. Terms still open: ${preview.openTerms.map(term => term.nameEn).join(', ')}`
        );
        return;
      }
    }

    const repeatIds = new Set(body.repeatStudentIds ?? []);

    const result = {
      copied: 0,
      promoted: 0,
      repeated: 0,
      graduated: 0,
      alreadyPlaced: 0,
      notPlaced: []
    };

    for (const item of preview.students) {

      const key = `${check.currentTerm.academicTermId}:${item.studentId}`;

      switch (item.suggestion) {
        case 5: result.alreadyPlaced++; continue;
        case 6: result.notPlaced.push(item); continue;
        case 0: result.copied++; placed.add(key); continue;
      }

      if (repeatIds.has(item.studentId)) {
        result.repeated++;
      } else if (item.targetClassId === null) {
        result.graduated++;
      } else {
        result.promoted++;
      }

      placed.add(key);
    }

    // A new-year rollover closes the old year's grades for good.
    if (preview.isNewYear) {
      for (const term of academicTerms) {
        if (term.academicYearId === check.fromTerm.academicYearId) {
          term.areGradesClosed = true;
          term.gradesClosedByRollover = true;
          term.gradesClosedAt = term.gradesClosedAt ?? new Date().toISOString().slice(0, 19);
        }
      }
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم الترحيل.',
      messageEn: 'Rollover completed.',
      data: result
    });

    return;
  }

  sendError(res, 404, 'غير موجود.', 'Endpoint not found.');
}


module.exports = rolloverRoutes;
