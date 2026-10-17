const subjectPlans = require('../data/subject-plans');
const teacherAssignments = require('../data/teacher-assignments');
const subjects = require('../data/subjects');
const schoolClasses = require('../data/school-classes');
const academicTerms = require('../data/academic-terms');
const users = require('../data/users');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Roles that can read plans: 0 = Admin, 1 = Assistant Principal, 2 = Teacher.
const READ_ROLES = [0, 1, 2];

// Roles that can change plans: 0 = Admin only.
const WRITE_ROLES = [0];

const FULL_WEIGHT = 100;
const MAX_MARK_LIMIT = 999.99;
const NAME_MAX_LENGTH = 100;


// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// Change them when the real API rules are known.
// =====================================================
//
// 1. The mock has no assessments or grades: plan.hasGrades and
//    component.hasMarks (data/subject-plans.js) stand for them.
// 2. Names are compared without spaces and without letter case
//    when looking for a repeated component name.
// 3. Copying keeps the components' order and creates new ids.
// 4. The text of the messages is not the real text.


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


function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}


function totalWeight(plan) {
  return round2(plan.components.reduce((sum, c) => sum + Number(c.weight), 0));
}


// The plan's sections: assignments with the same term, class and subject.
function planAssignments(plan) {
  return teacherAssignments.filter(a =>
    a.academicTermId === plan.academicTermId &&
    a.classId === plan.classId &&
    a.subjectId === plan.subjectId
  );
}


// The stored plan + the names and computed fields, like SubjectPlanDto.
function toDto(plan) {

  const term = academicTerms.find(t => t.academicTermId === plan.academicTermId);
  const schoolClass = schoolClasses.find(c => c.schoolClassId === plan.classId);
  const subject = subjects.find(s => s.subjectId === plan.subjectId);

  const total = totalWeight(plan);

  return {
    subjectPlanId: plan.subjectPlanId,

    academicTermId: plan.academicTermId,
    academicTermNameAr: term ? term.nameAr : '',
    academicTermNameEn: term ? term.nameEn : '',

    classId: plan.classId,
    classNameAr: schoolClass ? schoolClass.classNameAr : '',
    classNameEn: schoolClass ? schoolClass.classNameEn : '',

    subjectId: plan.subjectId,
    subjectAr: subject ? subject.subjectAr : '',
    subjectEn: subject ? subject.subjectEn : '',

    passingMark: plan.passingMark,
    isLocked: plan.isLocked,
    totalWeight: total,
    isComplete: total === FULL_WEIGHT,
    assignmentCount: planAssignments(plan).length,
    hasGrades: plan.hasGrades,

    components: [...plan.components]
      .sort((a, b) => a.order - b.order)
      .map(c => ({
        subjectPlanComponentId: c.subjectPlanComponentId,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        weight: c.weight,
        teacherAddsAssessments: c.teacherAddsAssessments,
        maxMark: c.teacherAddsAssessments ? null : c.maxMark,
        order: c.order
      }))
  };
}


// Sorted by term start date, then class level, then subject name.
function comparePlans(a, b) {

  const termA = academicTerms.find(t => t.academicTermId === a.academicTermId);
  const termB = academicTerms.find(t => t.academicTermId === b.academicTermId);

  const classA = schoolClasses.find(c => c.schoolClassId === a.classId);
  const classB = schoolClasses.find(c => c.schoolClassId === b.classId);

  const subjectA = subjects.find(s => s.subjectId === a.subjectId);
  const subjectB = subjects.find(s => s.subjectId === b.subjectId);

  return (termA ? termA.startDate : '').localeCompare(termB ? termB.startDate : '')
    || (classA ? classA.level : 0) - (classB ? classB.level : 0)
    || (subjectA ? subjectA.subjectAr : '').localeCompare(subjectB ? subjectB.subjectAr : '', 'ar');
}


function findPlan(planId) {
  return subjectPlans.find(p => p.subjectPlanId === planId);
}


function findComponent(componentId) {

  for (const plan of subjectPlans) {

    const component = plan.components.find(
      c => c.subjectPlanComponentId === componentId
    );

    if (component) {
      return { plan, component };
    }
  }

  return null;
}


function nextComponentId() {
  return Math.max(
    0,
    ...subjectPlans.flatMap(p => p.components.map(c => c.subjectPlanComponentId))
  ) + 1;
}


function cleanName(name) {
  return String(name || '').trim().toLowerCase();
}


// Checks one component (body of POST /components, or one item of POST /subjectplans).
// isNew = true when the type is part of the body.
// Returns an error [messageAr, messageEn], or null.
function validateComponent(data, isNew) {

  const nameAr = String(data.nameAr || '').trim();
  const nameEn = String(data.nameEn || '').trim();

  if (!nameAr || !nameEn) {
    return ['اسم البند مطلوب بالعربي والإنجليزي.', 'The component name is required in Arabic and English.'];
  }

  if (nameAr.length > NAME_MAX_LENGTH || nameEn.length > NAME_MAX_LENGTH) {
    return ['اسم البند يجب ألا يتجاوز 100 حرف.', 'The component name must be at most 100 characters.'];
  }

  const weight = Number(data.weight);

  if (typeof data.weight !== 'number' || !(weight > 0 && weight <= FULL_WEIGHT)) {
    return ['الوزن يجب أن يكون أكبر من 0 ولا يتجاوز 100.', 'Weight must be greater than 0 and at most 100.'];
  }

  if (isNew && typeof data.teacherAddsAssessments !== 'boolean') {
    return ['نوع البند مطلوب.', 'The component type is required.'];
  }

  return null;
}


function validateMaxMark(maxMark) {

  const mark = Number(maxMark);

  if (maxMark === null || maxMark === undefined || !(mark > 0 && mark <= MAX_MARK_LIMIT)) {
    return [
      'العلامة القصوى للبند الثابت مطلوبة، أكبر من 0 ولا تتجاوز 999.99.',
      'A fixed component needs a max mark above 0 and at most 999.99.'
    ];
  }

  return null;
}


function hasRepeatedNames(components) {

  const repeated = names => {
    const clean = names.map(cleanName);
    return new Set(clean).size !== clean.length;
  };

  return repeated(components.map(c => c.nameAr)) || repeated(components.map(c => c.nameEn));
}


const LOCKED_ERROR = [
  'الخطة مقفلة. افتح القفل أولًا للتعديل.',
  'The plan is locked. Unlock it first to make changes.'
];

const OVER_WEIGHT_ERROR = [
  'مجموع الأوزان لا يمكن أن يتجاوز 100.',
  'The weights cannot add up to more than 100.'
];


// =====================================================
// Subject Plans Routes
// =====================================================

function subjectPlansRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  // The path is compared in small letters so /api/SubjectPlans works too.
  const pathname = url.pathname.toLowerCase();

  if (
    pathname !== '/api/subjectplans' &&
    !pathname.startsWith('/api/subjectplans/')
  ) {
    return false;
  }


  if (DELAY_MS > 0) {

    setTimeout(
      () => handlePlans(req, res, url, pathname),
      DELAY_MS
    );

  } else {

    handlePlans(req, res, url, pathname);
  }

  return true;
}


async function handlePlans(req, res, url, pathname) {

  const currentUser = getCurrentUser(req);

  if (!currentUser) {
    sendEmpty(res, 401);
    return;
  }

  const canRead = READ_ROLES.includes(currentUser.role);
  const canWrite = WRITE_ROLES.includes(currentUser.role);

  const isRead = req.method === 'GET';

  if ((isRead && !canRead) || (!isRead && !canWrite)) {
    sendEmpty(res, 403);
    return;
  }


  const idMatch = pathname.match(/^\/api\/subjectplans\/(\d+)$/);
  const lockMatch = pathname.match(/^\/api\/subjectplans\/(\d+)\/lock$/);
  const addComponentMatch = pathname.match(/^\/api\/subjectplans\/(\d+)\/components$/);
  const componentMatch = pathname.match(/^\/api\/subjectplans\/components\/(\d+)$/);
  const byAssignmentMatch = pathname.match(/^\/api\/subjectplans\/by-assignment\/(\d+)$/);


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
  // GET /api/subjectplans?academicTermId=&classId=&subjectId=
  // =====================================================

  if (req.method === 'GET' && pathname === '/api/subjectplans') {

    const termId = Number(url.searchParams.get('academicTermId')) || null;
    const classId = Number(url.searchParams.get('classId')) || null;
    const subjectId = Number(url.searchParams.get('subjectId')) || null;

    const data = subjectPlans
      .filter(p =>
        (termId === null || p.academicTermId === termId) &&
        (classId === null || p.classId === classId) &&
        (subjectId === null || p.subjectId === subjectId)
      )
      .sort(comparePlans)
      .map(toDto);

    sendOk(res, 200, 'تم جلب خطط المواد بنجاح', 'Subject plans retrieved successfully', data);
    return;
  }


  // =====================================================
  // GET /api/subjectplans/by-assignment/{teacherAssignmentId}
  // =====================================================

  if (req.method === 'GET' && byAssignmentMatch) {

    const assignment = teacherAssignments.find(
      a => a.teacherAssignmentId === Number(byAssignmentMatch[1])
    );

    if (!assignment) {
      sendError(res, 400, 'التكليف غير موجود.', 'Teacher assignment not found.');
      return;
    }

    const plan = subjectPlans.find(p =>
      p.academicTermId === assignment.academicTermId &&
      p.classId === assignment.classId &&
      p.subjectId === assignment.subjectId
    );

    if (!plan) {
      sendError(res, 404, 'لا توجد خطة لهذه المادة بعد.', 'There is no subject plan yet.');
      return;
    }

    sendOk(res, 200, 'تم جلب خطة المادة بنجاح', 'Subject plan retrieved successfully', toDto(plan));
    return;
  }


  // =====================================================
  // GET /api/subjectplans/{id}
  // =====================================================

  if (req.method === 'GET' && idMatch) {

    const plan = findPlan(Number(idMatch[1]));

    if (!plan) {
      sendError(res, 404, 'الخطة غير موجودة.', 'Subject plan not found.');
      return;
    }

    sendOk(res, 200, 'تم جلب خطة المادة بنجاح', 'Subject plan retrieved successfully', toDto(plan));
    return;
  }


  // =====================================================
  // POST /api/subjectplans/copy
  // =====================================================

  if (req.method === 'POST' && pathname === '/api/subjectplans/copy') {

    const fromId = body.fromAcademicTermId;
    const toId = body.toAcademicTermId;

    if (!academicTerms.some(t => t.academicTermId === fromId) ||
        !academicTerms.some(t => t.academicTermId === toId)) {
      sendError(res, 400, 'الفصل الدراسي غير موجود.', 'Academic term not found.');
      return;
    }

    if (fromId === toId) {
      sendError(res, 400, 'لا يمكن النسخ إلى الفصل نفسه.', 'Cannot copy a term into itself.');
      return;
    }

    let copiedCount = 0;
    let skippedCount = 0;

    for (const plan of subjectPlans.filter(p => p.academicTermId === fromId)) {

      const schoolClass = schoolClasses.find(c => c.schoolClassId === plan.classId);
      const subject = subjects.find(s => s.subjectId === plan.subjectId);

      const exists = subjectPlans.some(p =>
        p.academicTermId === toId &&
        p.classId === plan.classId &&
        p.subjectId === plan.subjectId
      );

      if (exists || !schoolClass || !schoolClass.isActive || !subject || !subject.isActive) {
        skippedCount++;
        continue;
      }

      subjectPlans.push({
        subjectPlanId: Math.max(0, ...subjectPlans.map(p => p.subjectPlanId)) + 1,
        academicTermId: toId,
        classId: plan.classId,
        subjectId: plan.subjectId,
        passingMark: plan.passingMark,
        isLocked: false,
        hasGrades: false,
        components: plan.components.map(c => ({
          ...c,
          subjectPlanComponentId: nextComponentId(),
          hasMarks: false
        }))
      });

      copiedCount++;
    }

    sendOk(res, 200, 'تم نسخ الخطط', 'Subject plans copied', { copiedCount, skippedCount });
    return;
  }


  // =====================================================
  // POST /api/subjectplans
  // =====================================================

  if (req.method === 'POST' && pathname === '/api/subjectplans') {

    const term = academicTerms.find(t => t.academicTermId === body.academicTermId);

    if (!term) {
      sendError(res, 400, 'الفصل الدراسي غير موجود.', 'Academic term not found.');
      return;
    }

    const schoolClass = schoolClasses.find(c => c.schoolClassId === body.classId);

    if (!schoolClass) {
      sendError(res, 400, 'الصف غير موجود.', 'Class not found.');
      return;
    }

    if (!schoolClass.isActive) {
      sendError(res, 400, 'الصف غير فعال.', 'The class is inactive.');
      return;
    }

    const subject = subjects.find(s => s.subjectId === body.subjectId);

    if (!subject) {
      sendError(res, 400, 'المادة غير موجودة.', 'Subject not found.');
      return;
    }

    if (!subject.isActive) {
      sendError(res, 400, 'المادة غير فعالة.', 'The subject is inactive.');
      return;
    }

    if (subjectPlans.some(p =>
      p.academicTermId === body.academicTermId &&
      p.classId === body.classId &&
      p.subjectId === body.subjectId
    )) {
      sendError(
        res,
        400,
        'توجد خطة لهذه المادة في هذا الصف والفصل مسبقًا.',
        'A plan already exists for this term, class and subject.'
      );
      return;
    }

    const passingMark = Number(body.passingMark);

    if (typeof body.passingMark !== 'number' || !(passingMark > 0 && passingMark <= FULL_WEIGHT)) {
      sendError(res, 400, 'علامة النجاح يجب أن تكون أكبر من 0 ولا تتجاوز 100.', 'Passing mark must be greater than 0 and at most 100.');
      return;
    }

    const components = Array.isArray(body.components) ? body.components : [];

    for (const component of components) {

      const error = validateComponent(component, true)
        || (component.teacherAddsAssessments ? null : validateMaxMark(component.maxMark));

      if (error) {
        sendError(res, 400, error[0], error[1]);
        return;
      }
    }

    if (hasRepeatedNames(components)) {
      sendError(res, 400, 'اسم البند مكرر في الخطة.', 'A component name is repeated in the plan.');
      return;
    }

    if (round2(components.reduce((sum, c) => sum + Number(c.weight), 0)) > FULL_WEIGHT) {
      sendError(res, 400, OVER_WEIGHT_ERROR[0], OVER_WEIGHT_ERROR[1]);
      return;
    }

    let componentId = nextComponentId();

    const plan = {
      subjectPlanId: Math.max(0, ...subjectPlans.map(p => p.subjectPlanId)) + 1,
      academicTermId: body.academicTermId,
      classId: body.classId,
      subjectId: body.subjectId,
      passingMark,
      isLocked: false,
      hasGrades: false,
      components: components.map((c, index) => ({
        subjectPlanComponentId: componentId++,
        nameAr: String(c.nameAr).trim(),
        nameEn: String(c.nameEn).trim(),
        weight: Number(c.weight),
        teacherAddsAssessments: c.teacherAddsAssessments,
        maxMark: c.teacherAddsAssessments ? null : Number(c.maxMark),
        order: Number.isInteger(c.order) ? c.order : index + 1,
        hasMarks: false
      }))
    };

    subjectPlans.push(plan);

    sendOk(res, 201, 'تم إنشاء خطة المادة بنجاح.', 'Subject plan created successfully.', toDto(plan));
    return;
  }


  // =====================================================
  // PUT /api/subjectplans/{id}  (passing mark only)
  // =====================================================

  if (req.method === 'PUT' && idMatch) {

    const plan = findPlan(Number(idMatch[1]));

    if (!plan) {
      sendError(res, 404, 'الخطة غير موجودة.', 'Subject plan not found.');
      return;
    }

    if (plan.isLocked) {
      sendError(res, 400, LOCKED_ERROR[0], LOCKED_ERROR[1]);
      return;
    }

    const passingMark = Number(body.passingMark);

    if (typeof body.passingMark !== 'number' || !(passingMark > 0 && passingMark <= FULL_WEIGHT)) {
      sendError(res, 400, 'علامة النجاح يجب أن تكون أكبر من 0 ولا تتجاوز 100.', 'Passing mark must be greater than 0 and at most 100.');
      return;
    }

    plan.passingMark = passingMark;

    sendOk(res, 200, 'تم تعديل علامة النجاح.', 'Passing mark updated.', toDto(plan));
    return;
  }


  // =====================================================
  // DELETE /api/subjectplans/{id}  (only when no section follows it)
  // =====================================================

  if (req.method === 'DELETE' && idMatch) {

    const plan = findPlan(Number(idMatch[1]));

    if (!plan) {
      sendError(res, 404, 'الخطة غير موجودة.', 'Subject plan not found.');
      return;
    }

    if (planAssignments(plan).length > 0) {
      sendError(
        res,
        400,
        'لا يمكن حذف خطة تتبعها شعب. عدّلها بدلًا من ذلك.',
        'A plan that sections follow cannot be deleted. Edit it instead.'
      );
      return;
    }

    subjectPlans.splice(subjectPlans.indexOf(plan), 1);

    sendOk(res, 200, 'تم حذف الخطة.', 'Subject plan deleted.', null);
    return;
  }


  // =====================================================
  // PATCH /api/subjectplans/{id}/lock?isLocked=false
  // =====================================================

  if (req.method === 'PATCH' && lockMatch) {

    const plan = findPlan(Number(lockMatch[1]));

    if (!plan) {
      sendError(res, 404, 'الخطة غير موجودة.', 'Subject plan not found.');
      return;
    }

    const value = url.searchParams.get('isLocked');

    if (value !== 'true' && value !== 'false') {
      sendError(res, 400, 'قيمة القفل غير صالحة.', 'Invalid lock value.');
      return;
    }

    const isLocked = value === 'true';

    if (isLocked && totalWeight(plan) !== FULL_WEIGHT) {
      sendError(
        res,
        400,
        'لا يمكن قفل الخطة قبل أن يصبح مجموع الأوزان 100.',
        'The plan can be locked only when the weights add up to 100.'
      );
      return;
    }

    plan.isLocked = isLocked;

    sendOk(
      res,
      200,
      isLocked ? 'تم قفل الخطة.' : 'تم فتح قفل الخطة.',
      isLocked ? 'Subject plan locked.' : 'Subject plan unlocked.',
      toDto(plan)
    );
    return;
  }


  // =====================================================
  // POST /api/subjectplans/{id}/components
  // =====================================================

  if (req.method === 'POST' && addComponentMatch) {

    const plan = findPlan(Number(addComponentMatch[1]));

    if (!plan) {
      sendError(res, 404, 'الخطة غير موجودة.', 'Subject plan not found.');
      return;
    }

    if (plan.isLocked) {
      sendError(res, 400, LOCKED_ERROR[0], LOCKED_ERROR[1]);
      return;
    }

    const error = validateComponent(body, true)
      || (body.teacherAddsAssessments ? null : validateMaxMark(body.maxMark));

    if (error) {
      sendError(res, 400, error[0], error[1]);
      return;
    }

    if (hasRepeatedNames([...plan.components, body])) {
      sendError(res, 400, 'اسم البند مكرر في الخطة.', 'A component name is repeated in the plan.');
      return;
    }

    if (round2(totalWeight(plan) + Number(body.weight)) > FULL_WEIGHT) {
      sendError(res, 400, OVER_WEIGHT_ERROR[0], OVER_WEIGHT_ERROR[1]);
      return;
    }

    plan.components.push({
      subjectPlanComponentId: nextComponentId(),
      nameAr: String(body.nameAr).trim(),
      nameEn: String(body.nameEn).trim(),
      weight: Number(body.weight),
      teacherAddsAssessments: body.teacherAddsAssessments,
      maxMark: body.teacherAddsAssessments ? null : Number(body.maxMark),
      order: Number.isInteger(body.order)
        ? body.order
        : Math.max(0, ...plan.components.map(c => c.order)) + 1,
      hasMarks: false
    });

    sendOk(res, 201, 'تمت إضافة البند.', 'Component added.', toDto(plan));
    return;
  }


  // =====================================================
  // PUT /api/subjectplans/components/{componentId}
  // =====================================================

  if (req.method === 'PUT' && componentMatch) {

    const found = findComponent(Number(componentMatch[1]));

    if (!found) {
      sendError(res, 404, 'البند غير موجود.', 'Component not found.');
      return;
    }

    const { plan, component } = found;

    if (plan.isLocked) {
      sendError(res, 400, LOCKED_ERROR[0], LOCKED_ERROR[1]);
      return;
    }

    const error = validateComponent(body, false)
      || (component.teacherAddsAssessments ? null : validateMaxMark(body.maxMark));

    if (error) {
      sendError(res, 400, error[0], error[1]);
      return;
    }

    if (!component.teacherAddsAssessments &&
        component.hasMarks &&
        Number(body.maxMark) !== Number(component.maxMark)) {
      sendError(
        res,
        400,
        'لا يمكن تغيير العلامة القصوى لبند عليه علامات.',
        'The max mark of a component with marks cannot change.'
      );
      return;
    }

    const others = plan.components.filter(c => c !== component);

    if (hasRepeatedNames([...others, body])) {
      sendError(res, 400, 'اسم البند مكرر في الخطة.', 'A component name is repeated in the plan.');
      return;
    }

    const newTotal = round2(others.reduce((sum, c) => sum + Number(c.weight), 0) + Number(body.weight));

    if (newTotal > FULL_WEIGHT) {
      sendError(res, 400, OVER_WEIGHT_ERROR[0], OVER_WEIGHT_ERROR[1]);
      return;
    }

    component.nameAr = String(body.nameAr).trim();
    component.nameEn = String(body.nameEn).trim();
    component.weight = Number(body.weight);
    component.order = Number.isInteger(body.order) ? body.order : component.order;

    if (!component.teacherAddsAssessments) {
      component.maxMark = Number(body.maxMark);
    }

    sendOk(res, 200, 'تم تعديل البند.', 'Component updated.', toDto(plan));
    return;
  }


  // =====================================================
  // DELETE /api/subjectplans/components/{componentId}
  // =====================================================

  if (req.method === 'DELETE' && componentMatch) {

    const found = findComponent(Number(componentMatch[1]));

    if (!found) {
      sendError(res, 404, 'البند غير موجود.', 'Component not found.');
      return;
    }

    const { plan, component } = found;

    if (plan.isLocked) {
      sendError(res, 400, LOCKED_ERROR[0], LOCKED_ERROR[1]);
      return;
    }

    if (component.hasMarks) {
      sendError(
        res,
        400,
        'لا يمكن حذف بند عليه علامات.',
        'A component with marks cannot be deleted.'
      );
      return;
    }

    plan.components.splice(plan.components.indexOf(component), 1);

    sendOk(res, 200, 'تم حذف البند.', 'Component deleted.', toDto(plan));
    return;
  }


  // =====================================================
  // Any other method / path under /api/subjectplans
  // =====================================================

  sendError(res, 404, 'المسار غير موجود.', 'Endpoint not found.');
}


module.exports = subjectPlansRoutes;
