const studentGrades = require('../data/student-grades');
const assessments = require('../data/assessments');
const teacherAssignments = require('../data/teacher-assignments');
const subjectPlans = require('../data/subject-plans');
const teachers = require('../data/teachers');
const students = require('../data/students');
const subjects = require('../data/subjects');
const sections = require('../data/sections');
const schoolClasses = require('../data/school-classes');
const users = require('../data/users');

const { syncWithPlan } = require('./assessments.routes');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Roles that can read: 0 = Admin, 1 = Assistant Principal (read-only),
// 2 = Teacher (their own assignments only).
const READ_ROLES = [0, 1, 2];

// Roles that can save marks: 0 = Admin, 2 = Teacher (own assignments).
// Any write from the Assistant Principal gets 403.
const WRITE_ROLES = [0, 2];

const TEACHER_ROLE = 2;

const FULL_WEIGHT = 100;

// The most marks one bulk request can save.
const BULK_LIMIT = 2000;


// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// Change them when the real API rules are known.
// =====================================================
//
// 1. The mock has no StudentSubjectEnrollment and no term placements:
//    the students of a sheet are the ACTIVE students whose classId and
//    sectionId are the assignment's (data/students.js), in every term.
//    An inactive assignment has no students.
// 2. Only the sheet and the bulk save are built (the grades page uses
//    only these two). GET/POST/PUT of a single grade answer 404 here.
// 3. Saving marks also updates the flags the other mocks use for "marks
//    exist": plan.isLocked, plan.hasGrades, component.hasMarks and
//    assessment.hasMarks (so the plans and assessments pages agree).
// 4. The text of the messages is not the real text.


// =====================================================
// SEED: marks added the first time a sheet is read
// =====================================================
//
// Current term only. The marks follow the students of the section
// sorted by studentId (null = no mark). Assessments are found by their
// English name (Quiz 1, First exam, Final exam...).
//
// Things to try (log in as "teacher", then Grades):
// - Arabic · Class 1 / A: quizzes 1-2 and the first exam have marks,
//   Quiz 3 and the final exam don't → every student is "Incomplete".
//   Type the missing marks and save to see the totals.
// - Arabic · Class 1 / B: every mark exists → totals, one student fails.
// - Arabic · Class 2 / A: no quizzes yet → "No assessment yet" column.
// As "admin": Science · Class 1 / A (plan 80 of 100) → read-only sheet.
// As "assistant": any sheet is view only.
const CURRENT_TERM = 5;

const SEED = [
  {
    classId: 1, sectionId: 1, subjectId: 1, // Arabic · Class 1 / A
    marks: {
      'Quiz 1': [8, 6, 9, 5],
      'Quiz 2': [4, 3, 5, 2],
      'First exam': [16, 11, 18, 9]
    }
  },
  {
    classId: 1, sectionId: 2, subjectId: 1, // Arabic · Class 1 / B
    marks: {
      'Quiz 1': [9, 7, 4, 10],
      'First exam': [18, 14, 8, 19],
      'Final exam': [52, 40, 20, 57]
    }
  }
];

// The user the seeded marks are recorded by ("teacher", data/users.js).
const SEED_USER_ID = 3;

let seeded = false;


// =====================================================
// Helpers
// =====================================================

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode);
  res.end(JSON.stringify(body));
}


// 401 / 403: the real backend now sends a body too, but the app
// only looks at the status code for them.
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


function sendOk(res, statusCode, messageAr, messageEn, data) {
  sendJson(res, statusCode, {
    success: true,
    messageAr,
    messageEn,
    data
  });
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


// UTC without a trailing "Z", like the real backend.
function getUtcNow() {
  return new Date().toISOString().replace('Z', '');
}


function round2(value) {
  return Math.round(value * 100) / 100;
}


function findAssignment(assignmentId) {
  return teacherAssignments.find(a => a.teacherAssignmentId === assignmentId);
}


// The plan a section follows (same term, class and subject), or undefined.
function findPlan(assignment) {
  return subjectPlans.find(p =>
    p.academicTermId === assignment.academicTermId &&
    p.classId === assignment.classId &&
    p.subjectId === assignment.subjectId
  );
}


function totalWeight(plan) {
  return plan
    ? round2(plan.components.reduce((sum, c) => sum + Number(c.weight), 0))
    : 0;
}


// Marks can be entered only when the plan exists and its weights are 100.
function canEnterGrades(plan) {
  return !!plan && totalWeight(plan) === FULL_WEIGHT;
}


function sortedComponents(plan) {
  return plan
    ? [...plan.components].sort((a, b) => a.order - b.order)
    : [];
}


// The assessments of a section, grouped by component (in the plan's order),
// then by order (fixed assessments first: their order is 0).
function sectionAssessments(assignment, plan) {

  syncWithPlan(assignment);

  const componentOrder = new Map(
    sortedComponents(plan).map((c, index) => [c.subjectPlanComponentId, index])
  );

  return assessments
    .filter(a => a.teacherAssignmentId === assignment.teacherAssignmentId)
    .sort((a, b) =>
      ((componentOrder.get(a.subjectPlanComponentId) ?? 0)
        - (componentOrder.get(b.subjectPlanComponentId) ?? 0))
      || (a.order - b.order)
      || (a.assessmentId - b.assessmentId)
    );
}


// See ASSUMPTIONS 1.
function enrolledStudents(assignment) {

  if (!assignment.isActive) {
    return [];
  }

  return students.filter(s =>
    s.isActive &&
    s.classId === assignment.classId &&
    s.sectionId === assignment.sectionId
  );
}


function fullName(student, lang) {
  return [
    student[`firstName${lang}`],
    student[`fatherName${lang}`],
    student[`grandFatherName${lang}`],
    student[`familyName${lang}`]
  ]
    .map(part => String(part || '').trim())
    .filter(part => part !== '')
    .join(' ');
}


function findGrade(studentId, assessmentId) {
  return studentGrades.find(g =>
    g.studentId === studentId && g.assessmentId === assessmentId
  );
}


function nextGradeId() {
  return Math.max(0, ...studentGrades.map(g => g.studentGradeId)) + 1;
}


// "Marks exist" for the other mocks (see ASSUMPTIONS 3).
function markHasMarks(assessment, plan) {

  if (!assessment.isFixed) {
    assessment.hasMarks = true;
  }

  const component = plan.components.find(
    c => c.subjectPlanComponentId === assessment.subjectPlanComponentId
  );

  if (component) {
    component.hasMarks = true;
  }

  plan.hasGrades = true;
  plan.isLocked = true;
}


// Adds the SEED marks once.
function seedOnce() {

  if (seeded) {
    return;
  }

  seeded = true;

  for (const item of SEED) {

    const assignment = teacherAssignments.find(a =>
      a.academicTermId === CURRENT_TERM &&
      a.classId === item.classId &&
      a.sectionId === item.sectionId &&
      a.subjectId === item.subjectId
    );

    const plan = assignment ? findPlan(assignment) : undefined;

    if (!assignment || !plan) {
      continue;
    }

    const sectionStudents = enrolledStudents(assignment)
      .sort((a, b) => a.studentId - b.studentId);

    const list = sectionAssessments(assignment, plan);

    for (const [nameEn, marks] of Object.entries(item.marks)) {

      const assessment = list.find(a => a.nameEn === nameEn);

      if (!assessment) {
        continue;
      }

      sectionStudents.forEach((student, index) => {

        const mark = marks[index];

        if (mark === null || mark === undefined || mark > assessment.maxMark) {
          return;
        }

        studentGrades.push({
          studentGradeId: nextGradeId(),
          studentId: student.studentId,
          assessmentId: assessment.assessmentId,
          mark,
          recordedByUserId: SEED_USER_ID,
          recordedAt: '2026-10-15T08:30:00',
          editedByUserId: null,
          editedAt: null
        });

        markHasMarks(assessment, plan);
      });
    }
  }
}


// The grade sheet of one assignment (same shape as the real API).
//
// score of a component (out of its weight) = average of (mark ÷ max mark) × weight,
// null when the component has no assessment or a mark is missing.
// total = the sum of the scores, null until every score exists and the
// weights add up to 100. isPassed = total >= passingMark.
function buildSheet(assignment) {

  const plan = findPlan(assignment);

  const schoolClass = schoolClasses.find(c => c.schoolClassId === assignment.classId);
  const section = sections.find(s => s.sectionId === assignment.sectionId);
  const subject = subjects.find(s => s.subjectId === assignment.subjectId);

  const components = sortedComponents(plan);
  const list = plan ? sectionAssessments(assignment, plan) : [];
  const ready = canEnterGrades(plan);

  const sheetStudents = enrolledStudents(assignment)
    .map(student => {

      const marks = list.map(a => {
        const grade = findGrade(student.studentId, a.assessmentId);
        return {
          assessmentId: a.assessmentId,
          studentGradeId: grade ? grade.studentGradeId : null,
          mark: grade ? grade.mark : null
        };
      });

      const componentScores = components.map(component => {

        const own = list.filter(
          a => a.subjectPlanComponentId === component.subjectPlanComponentId
        );

        if (own.length === 0) {
          return { subjectPlanComponentId: component.subjectPlanComponentId, score: null };
        }

        let sum = 0;

        for (const a of own) {

          const grade = findGrade(student.studentId, a.assessmentId);

          if (!grade) {
            return { subjectPlanComponentId: component.subjectPlanComponentId, score: null };
          }

          sum += grade.mark / a.maxMark;
        }

        return {
          subjectPlanComponentId: component.subjectPlanComponentId,
          score: round2(sum / own.length * component.weight)
        };
      });

      const complete = ready
        && componentScores.length > 0
        && componentScores.every(s => s.score !== null);

      const total = complete
        ? round2(componentScores.reduce((sum, s) => sum + s.score, 0))
        : null;

      return {
        studentId: student.studentId,
        studentNumber: student.studentNumber,
        studentNameAr: fullName(student, 'Ar'),
        studentNameEn: fullName(student, 'En'),
        marks,
        componentScores,
        total,
        isPassed: total === null ? null : total >= plan.passingMark
      };
    })
    .sort((a, b) => a.studentNameAr.localeCompare(b.studentNameAr, 'ar'));

  return {
    teacherAssignmentId: assignment.teacherAssignmentId,

    subjectAr: subject ? subject.subjectAr : '',
    subjectEn: subject ? subject.subjectEn : '',

    classNameAr: schoolClass ? schoolClass.classNameAr : '',
    classNameEn: schoolClass ? schoolClass.classNameEn : '',

    sectionAr: section ? section.sectionAr : '',
    sectionEn: section ? section.sectionEn : '',

    subjectPlanId: plan ? plan.subjectPlanId : null,
    passingMark: plan ? plan.passingMark : null,
    isPlanLocked: plan ? plan.isLocked : false,
    totalWeight: totalWeight(plan),
    canEnterGrades: ready,

    components: components.map(c => ({
      subjectPlanComponentId: c.subjectPlanComponentId,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      weight: c.weight,
      teacherAddsAssessments: c.teacherAddsAssessments,
      order: c.order,
      assessmentCount: list.filter(
        a => a.subjectPlanComponentId === c.subjectPlanComponentId
      ).length
    })),

    assessments: list.map(a => ({
      assessmentId: a.assessmentId,
      subjectPlanComponentId: a.subjectPlanComponentId,
      nameAr: a.nameAr,
      nameEn: a.nameEn,
      maxMark: a.maxMark,
      order: a.order,
      isFixed: a.isFixed
    })),

    students: sheetStudents
  };
}


const NOT_OWNER_ERROR = [
  'يمكنك فقط عرض أو تسجيل أو تعديل علامات المواد المسندة إليك.',
  'You can only view, record or edit grades for your own assignments.'
];


// =====================================================
// Student Grades Routes
// =====================================================

function studentGradesRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  // The path is compared in small letters so /api/StudentGrades works too.
  const pathname = url.pathname.toLowerCase();

  if (
    pathname !== '/api/studentgrades' &&
    !pathname.startsWith('/api/studentgrades/')
  ) {
    return false;
  }


  if (DELAY_MS > 0) {

    setTimeout(
      () => handleStudentGrades(req, res, url, pathname),
      DELAY_MS
    );

  } else {

    handleStudentGrades(req, res, url, pathname);
  }

  return true;
}


async function handleStudentGrades(req, res, url, pathname) {

  const currentUser = getCurrentUser(req);

  if (!currentUser) {
    sendEmpty(res, 401);
    return;
  }

  const isRead = req.method === 'GET';

  if (
    (isRead && !READ_ROLES.includes(currentUser.role)) ||
    (!isRead && !WRITE_ROLES.includes(currentUser.role))
  ) {
    sendEmpty(res, 403);
    return;
  }


  // A teacher works on their own assignments only.
  // The teacher and the login user are linked by the same userId.
  const isTeacher = currentUser.role === TEACHER_ROLE;

  const teacher = isTeacher
    ? teachers.find(t => t.userId === currentUser.userId)
    : null;

  if (isTeacher && !teacher) {
    sendError(res, 400, 'لا يوجد ملف معلم لهذا المستخدم.', 'No teacher profile was found for this user.');
    return;
  }

  const ownsAssignment = assignment =>
    !isTeacher || assignment.teacherId === teacher.teacherId;


  seedOnce();


  // =====================================================
  // GET /api/studentgrades/sheet?teacherAssignmentId={id}
  // =====================================================

  if (req.method === 'GET' && pathname === '/api/studentgrades/sheet') {

    const assignment = findAssignment(
      Number(url.searchParams.get('teacherAssignmentId'))
    );

    if (!assignment) {
      sendError(res, 400, 'التكليف غير موجود.', 'Teacher assignment not found.');
      return;
    }

    if (!ownsAssignment(assignment)) {
      sendError(res, 400, NOT_OWNER_ERROR[0], NOT_OWNER_ERROR[1]);
      return;
    }

    sendOk(
      res,
      200,
      'تم جلب كشف العلامات بنجاح',
      'Grade sheet retrieved successfully',
      buildSheet(assignment)
    );
    return;
  }


  // =====================================================
  // POST /api/studentgrades/bulk
  // All or nothing: every row is checked before anything is saved.
  // =====================================================

  if (req.method === 'POST' && pathname === '/api/studentgrades/bulk') {

    let body;

    try {
      body = await getRequestBody(req);
    } catch {
      sendError(res, 400, 'بيانات الطلب غير صالحة.', 'Invalid request body.');
      return;
    }

    const assignment = findAssignment(body.teacherAssignmentId);

    if (!assignment) {
      sendError(res, 400, 'التكليف غير موجود.', 'Teacher assignment not found.');
      return;
    }

    if (!ownsAssignment(assignment)) {
      sendError(res, 400, NOT_OWNER_ERROR[0], NOT_OWNER_ERROR[1]);
      return;
    }

    const plan = findPlan(assignment);

    if (!canEnterGrades(plan)) {
      sendError(
        res,
        400,
        'لا يمكن إدخال العلامات: خطة المادة غير موجودة أو مجموع أوزانها ليس 100.',
        'Marks cannot be entered: the subject plan is missing or its weights do not add up to 100.'
      );
      return;
    }

    const marks = Array.isArray(body.marks) ? body.marks : [];

    if (marks.length === 0) {
      sendError(res, 400, 'لا توجد علامات لحفظها.', 'There are no marks to save.');
      return;
    }

    if (marks.length > BULK_LIMIT) {
      sendError(
        res,
        400,
        `لا يمكن حفظ أكثر من ${BULK_LIMIT} علامة في طلب واحد.`,
        `At most ${BULK_LIMIT} marks can be saved in one request.`
      );
      return;
    }

    const list = sectionAssessments(assignment, plan);
    const enrolledIds = new Set(enrolledStudents(assignment).map(s => s.studentId));
    const seen = new Set();

    // 1. Check every row first.
    for (let i = 0; i < marks.length; i++) {

      const row = marks[i] || {};
      const rowNumber = i + 1;

      const rowError = (ar, en) => sendError(
        res,
        400,
        `السطر ${rowNumber}: ${ar} لم يتم حفظ أي علامة.`,
        `Row ${rowNumber}: ${en} Nothing was saved.`
      );

      const assessment = list.find(a => a.assessmentId === row.assessmentId);

      if (!assessment) {
        rowError('التقييم ليس من هذه الشعبة.', 'The assessment is not part of this section.');
        return;
      }

      if (!enrolledIds.has(row.studentId)) {
        rowError('الطالب غير مسجل في هذه المادة.', 'The student is not enrolled in this subject.');
        return;
      }

      const mark = row.mark;

      if (typeof mark !== 'number' || !(mark >= 0 && mark <= assessment.maxMark)) {
        rowError(
          `العلامة يجب أن تكون بين 0 و ${assessment.maxMark}.`,
          `The mark must be between 0 and ${assessment.maxMark}.`
        );
        return;
      }

      const key = `${row.studentId}-${row.assessmentId}`;

      if (seen.has(key)) {
        rowError('نفس الطالب ونفس التقييم أكثر من مرة.', 'The same student and assessment appear twice.');
        return;
      }

      seen.add(key);
    }

    // 2. Save.
    const now = getUtcNow();

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const row of marks) {

      const assessment = list.find(a => a.assessmentId === row.assessmentId);
      const mark = round2(row.mark);
      const grade = findGrade(row.studentId, row.assessmentId);

      if (!grade) {

        studentGrades.push({
          studentGradeId: nextGradeId(),
          studentId: row.studentId,
          assessmentId: row.assessmentId,
          mark,
          recordedByUserId: currentUser.userId,
          recordedAt: now,
          editedByUserId: null,
          editedAt: null
        });

        created++;

      } else if (Number(grade.mark) === mark) {

        unchanged++;

      } else {

        grade.mark = mark;
        grade.editedByUserId = currentUser.userId;
        grade.editedAt = now;

        updated++;
      }

      // Saving locks the plan, like a single mark.
      markHasMarks(assessment, plan);
    }

    sendOk(
      res,
      200,
      `تم حفظ العلامات: ${created} جديدة، ${updated} معدّلة، ${unchanged} بدون تغيير.`,
      `Marks saved: ${created} new, ${updated} changed, ${unchanged} unchanged.`,
      {
        created,
        updated,
        unchanged,
        sheet: buildSheet(assignment)
      }
    );
    return;
  }


  // =====================================================
  // Any other method / path under /api/studentgrades
  // (see ASSUMPTIONS 2)
  // =====================================================

  sendError(res, 404, 'المسار غير موجود.', 'Endpoint not found.');
}


module.exports = studentGradesRoutes;
