const assessments = require('../data/assessments');
const teacherAssignments = require('../data/teacher-assignments');
const subjectPlans = require('../data/subject-plans');
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

// Roles that can read: 0 = Admin, 1 = Assistant Principal (read-only),
// 2 = Teacher (their own assignments only).
const READ_ROLES = [0, 1, 2];

// Roles that can add, edit and delete: 0 = Admin, 2 = Teacher (own assignments).
// Any write from the Assistant Principal gets 403.
const WRITE_ROLES = [0, 2];

const TEACHER_ROLE = 2;

const MAX_MARK_LIMIT = 999.99;
const NAME_MAX_LENGTH = 100;


// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// Change them when the real API rules are known.
// =====================================================
//
// 1. The mock has no grades: assessment.hasMarks stands for them
//    (data/assessments.js). A fixed assessment takes it from its component.
// 2. Fixed assessments are created (or updated) from the plan when a
//    section's assessments are read, instead of when the plan changes.
// 3. Assessments of a component that was deleted from the plan disappear.
// 4. A name is limited to 100 characters, like a component name.
// 5. The text of the messages is not the real text.


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


function findComponent(plan, componentId) {
  return plan
    ? plan.components.find(c => c.subjectPlanComponentId === componentId)
    : undefined;
}


function nextAssessmentId() {
  return Math.max(0, ...assessments.map(a => a.assessmentId)) + 1;
}


// Keeps the section's assessments in line with its plan:
//   - one fixed assessment per fixed component (created when missing,
//     name and max mark copied from the component)
//   - assessments of a component that is no longer in the plan are removed
function syncWithPlan(assignment) {

  const plan = findPlan(assignment);

  // No plan: the section has no assessments.
  const componentIds = plan
    ? plan.components.map(c => c.subjectPlanComponentId)
    : [];

  for (let i = assessments.length - 1; i >= 0; i--) {

    const a = assessments[i];

    if (
      a.teacherAssignmentId === assignment.teacherAssignmentId &&
      !componentIds.includes(a.subjectPlanComponentId)
    ) {
      assessments.splice(i, 1);
    }
  }

  if (!plan) {
    return;
  }

  for (const component of plan.components.filter(c => !c.teacherAddsAssessments)) {

    const fixed = assessments.find(a =>
      a.teacherAssignmentId === assignment.teacherAssignmentId &&
      a.subjectPlanComponentId === component.subjectPlanComponentId &&
      a.isFixed
    );

    if (fixed) {
      fixed.nameAr = component.nameAr;
      fixed.nameEn = component.nameEn;
      fixed.maxMark = component.maxMark;
      continue;
    }

    assessments.push({
      assessmentId: nextAssessmentId(),
      teacherAssignmentId: assignment.teacherAssignmentId,
      subjectPlanComponentId: component.subjectPlanComponentId,
      isFixed: true,
      nameAr: component.nameAr,
      nameEn: component.nameEn,
      maxMark: component.maxMark,
      order: 0,
      hasMarks: false
    });
  }
}


// true when the assessment has marks.
// A fixed assessment takes it from its plan component.
function hasMarks(assessment) {

  if (!assessment.isFixed) {
    return assessment.hasMarks;
  }

  const assignment = findAssignment(assessment.teacherAssignmentId);
  const component = assignment
    ? findComponent(findPlan(assignment), assessment.subjectPlanComponentId)
    : undefined;

  return component ? component.hasMarks : false;
}


// The stored assessment + the names, like AssessmentDto.
function toDto(assessment) {

  const assignment = findAssignment(assessment.teacherAssignmentId);

  const teacher = teachers.find(t => t.teacherId === assignment.teacherId);
  const term = academicTerms.find(t => t.academicTermId === assignment.academicTermId);
  const schoolClass = schoolClasses.find(c => c.schoolClassId === assignment.classId);
  const section = sections.find(s => s.sectionId === assignment.sectionId);
  const subject = subjects.find(s => s.subjectId === assignment.subjectId);
  const component = findComponent(findPlan(assignment), assessment.subjectPlanComponentId);

  return {
    assessmentId: assessment.assessmentId,

    teacherAssignmentId: assessment.teacherAssignmentId,

    teacherId: assignment.teacherId,
    teacherNumber: teacher ? teacher.teacherNumber : '',

    academicTermId: assignment.academicTermId,
    academicTermNameAr: term ? term.nameAr : '',
    academicTermNameEn: term ? term.nameEn : '',

    subjectAr: subject ? subject.subjectAr : '',
    subjectEn: subject ? subject.subjectEn : '',

    classNameAr: schoolClass ? schoolClass.classNameAr : '',
    classNameEn: schoolClass ? schoolClass.classNameEn : '',

    sectionAr: section ? section.sectionAr : '',
    sectionEn: section ? section.sectionEn : '',

    subjectPlanComponentId: assessment.subjectPlanComponentId,
    componentNameAr: component ? component.nameAr : '',
    componentNameEn: component ? component.nameEn : '',

    isFixed: assessment.isFixed,

    nameAr: assessment.nameAr,
    nameEn: assessment.nameEn,
    maxMark: assessment.maxMark,
    order: assessment.order
  };
}


// Sorted by component (its order in the plan), then by order.
function compareAssessments(a, b) {

  const plan = findPlan(findAssignment(a.teacherAssignmentId));

  const componentA = findComponent(plan, a.subjectPlanComponentId);
  const componentB = findComponent(plan, b.subjectPlanComponentId);

  return ((componentA ? componentA.order : 0) - (componentB ? componentB.order : 0))
    || (a.order - b.order)
    || (a.assessmentId - b.assessmentId);
}


// Checks the names and the max mark of a body.
// Returns an error [messageAr, messageEn], or null.
function validateBody(data) {

  const nameAr = String(data.nameAr || '').trim();
  const nameEn = String(data.nameEn || '').trim();

  if (!nameAr || !nameEn) {
    return ['اسم التقييم مطلوب بالعربي والإنجليزي.', 'The assessment name is required in Arabic and English.'];
  }

  if (nameAr.length > NAME_MAX_LENGTH || nameEn.length > NAME_MAX_LENGTH) {
    return ['اسم التقييم يجب ألا يتجاوز 100 حرف.', 'The assessment name must be at most 100 characters.'];
  }

  const maxMark = Number(data.maxMark);

  if (typeof data.maxMark !== 'number' || !(maxMark > 0 && maxMark <= MAX_MARK_LIMIT)) {
    return ['العلامة القصوى يجب أن تكون أكبر من 0 ولا تتجاوز 999.99.', 'Max mark must be greater than 0 and at most 999.99.'];
  }

  return null;
}


const NOT_OWNER_ERROR = [
  'يمكنك فقط عرض أو إدارة تقييمات المواد المسندة إليك.',
  'You can only view or manage assessments of your own assignments.'
];

const FIXED_ERROR = [
  'هذا تقييم ثابت من خطة المادة، ولا يمكن تعديله أو حذفه.',
  'This is a fixed assessment from the subject plan. It cannot be edited or deleted.'
];


// =====================================================
// Assessments Routes
// =====================================================

function assessmentsRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  // The path is compared in small letters so /api/Assessments works too.
  const pathname = url.pathname.toLowerCase();

  if (
    pathname !== '/api/assessments' &&
    !pathname.startsWith('/api/assessments/')
  ) {
    return false;
  }


  if (DELAY_MS > 0) {

    setTimeout(
      () => handleAssessments(req, res, pathname),
      DELAY_MS
    );

  } else {

    handleAssessments(req, res, pathname);
  }

  return true;
}


async function handleAssessments(req, res, pathname) {

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


  const idMatch = pathname.match(/^\/api\/assessments\/(\d+)$/);
  const byAssignmentMatch = pathname.match(/^\/api\/assessments\/by-assignment\/(\d+)$/);


  let body = {};

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      body = await getRequestBody(req);
    } catch {
      sendError(res, 400, 'بيانات الطلب غير صالحة.', 'Invalid request body.');
      return;
    }
  }


  // =====================================================
  // GET /api/assessments/by-assignment/{teacherAssignmentId}
  // =====================================================

  if (req.method === 'GET' && byAssignmentMatch) {

    const assignment = findAssignment(Number(byAssignmentMatch[1]));

    if (!assignment) {
      sendError(res, 400, 'التكليف غير موجود.', 'Teacher assignment not found.');
      return;
    }

    if (!ownsAssignment(assignment)) {
      sendError(res, 400, NOT_OWNER_ERROR[0], NOT_OWNER_ERROR[1]);
      return;
    }

    syncWithPlan(assignment);

    const data = assessments
      .filter(a => a.teacherAssignmentId === assignment.teacherAssignmentId)
      .sort(compareAssessments)
      .map(toDto);

    sendOk(res, 200, 'تم جلب التقييمات بنجاح', 'Assessments retrieved successfully', data);
    return;
  }


  // =====================================================
  // GET /api/assessments/{assessmentId}
  // =====================================================

  if (req.method === 'GET' && idMatch) {

    const assessment = assessments.find(a => a.assessmentId === Number(idMatch[1]));

    if (!assessment) {
      sendError(res, 404, 'التقييم غير موجود.', 'Assessment not found.');
      return;
    }

    if (!ownsAssignment(findAssignment(assessment.teacherAssignmentId))) {
      sendError(res, 400, NOT_OWNER_ERROR[0], NOT_OWNER_ERROR[1]);
      return;
    }

    sendOk(res, 200, 'تم جلب التقييم بنجاح', 'Assessment retrieved successfully', toDto(assessment));
    return;
  }


  // =====================================================
  // POST /api/assessments  (under an open component only)
  // =====================================================

  if (req.method === 'POST' && pathname === '/api/assessments') {

    const assignment = findAssignment(body.teacherAssignmentId);

    if (!assignment) {
      sendError(res, 400, 'التكليف غير موجود.', 'Teacher assignment not found.');
      return;
    }

    if (!ownsAssignment(assignment)) {
      sendError(res, 400, NOT_OWNER_ERROR[0], NOT_OWNER_ERROR[1]);
      return;
    }

    if (!assignment.isActive) {
      sendError(res, 400, 'التكليف غير فعال.', 'The teacher assignment is inactive.');
      return;
    }

    const plan = findPlan(assignment);

    if (!plan) {
      sendError(res, 400, 'لا توجد خطة لهذه المادة بعد.', 'There is no subject plan yet.');
      return;
    }

    const component = findComponent(plan, body.subjectPlanComponentId);

    if (!component) {
      sendError(res, 400, 'البند ليس من خطة هذه المادة.', 'The component is not part of this subject plan.');
      return;
    }

    if (!component.teacherAddsAssessments) {
      sendError(
        res,
        400,
        'هذا بند ثابت، تقييمه يُنشأ من خطة المادة.',
        'This is a fixed component. Its assessment comes from the subject plan.'
      );
      return;
    }

    const error = validateBody(body);

    if (error) {
      sendError(res, 400, error[0], error[1]);
      return;
    }

    const sameComponent = assessments.filter(a =>
      a.teacherAssignmentId === assignment.teacherAssignmentId &&
      a.subjectPlanComponentId === component.subjectPlanComponentId
    );

    const assessment = {
      assessmentId: nextAssessmentId(),
      teacherAssignmentId: assignment.teacherAssignmentId,
      subjectPlanComponentId: component.subjectPlanComponentId,
      isFixed: false,
      nameAr: String(body.nameAr).trim(),
      nameEn: String(body.nameEn).trim(),
      maxMark: Number(body.maxMark),
      order: Number.isInteger(body.order)
        ? body.order
        : Math.max(0, ...sameComponent.map(a => a.order)) + 1,
      hasMarks: false
    };

    assessments.push(assessment);

    sendOk(res, 201, 'تمت إضافة التقييم بنجاح.', 'Assessment added successfully.', toDto(assessment));
    return;
  }


  // =====================================================
  // PUT /api/assessments/{assessmentId}  (teacher-added only)
  // =====================================================

  if (req.method === 'PUT' && idMatch) {

    const assessment = assessments.find(a => a.assessmentId === Number(idMatch[1]));

    if (!assessment) {
      sendError(res, 404, 'التقييم غير موجود.', 'Assessment not found.');
      return;
    }

    if (!ownsAssignment(findAssignment(assessment.teacherAssignmentId))) {
      sendError(res, 400, NOT_OWNER_ERROR[0], NOT_OWNER_ERROR[1]);
      return;
    }

    if (assessment.isFixed) {
      sendError(res, 400, FIXED_ERROR[0], FIXED_ERROR[1]);
      return;
    }

    const error = validateBody(body);

    if (error) {
      sendError(res, 400, error[0], error[1]);
      return;
    }

    if (hasMarks(assessment) && Number(body.maxMark) !== Number(assessment.maxMark)) {
      sendError(
        res,
        400,
        'لا يمكن تغيير العلامة القصوى لتقييم عليه علامات.',
        'The max mark of an assessment with marks cannot change.'
      );
      return;
    }

    assessment.nameAr = String(body.nameAr).trim();
    assessment.nameEn = String(body.nameEn).trim();
    assessment.maxMark = Number(body.maxMark);
    assessment.order = Number.isInteger(body.order) ? body.order : assessment.order;

    sendOk(res, 200, 'تم تعديل التقييم بنجاح.', 'Assessment updated successfully.', toDto(assessment));
    return;
  }


  // =====================================================
  // DELETE /api/assessments/{assessmentId}  (teacher-added, without marks)
  // =====================================================

  if (req.method === 'DELETE' && idMatch) {

    const assessment = assessments.find(a => a.assessmentId === Number(idMatch[1]));

    if (!assessment) {
      sendError(res, 404, 'التقييم غير موجود.', 'Assessment not found.');
      return;
    }

    if (!ownsAssignment(findAssignment(assessment.teacherAssignmentId))) {
      sendError(res, 400, NOT_OWNER_ERROR[0], NOT_OWNER_ERROR[1]);
      return;
    }

    if (assessment.isFixed) {
      sendError(res, 400, FIXED_ERROR[0], FIXED_ERROR[1]);
      return;
    }

    if (hasMarks(assessment)) {
      sendError(
        res,
        400,
        'لا يمكن حذف تقييم عليه علامات.',
        'An assessment with marks cannot be deleted.'
      );
      return;
    }

    assessments.splice(assessments.indexOf(assessment), 1);

    sendOk(res, 200, 'تم حذف التقييم بنجاح.', 'Assessment deleted successfully.', null);
    return;
  }


  // =====================================================
  // Any other method / path under /api/assessments
  // =====================================================

  sendError(res, 404, 'المسار غير موجود.', 'Endpoint not found.');
}


module.exports = assessmentsRoutes;
