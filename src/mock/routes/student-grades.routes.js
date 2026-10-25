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
const academicTerms = require('../data/academic-terms');
const academicYears = require('../data/academic-years');
const { parents, parentStudents } = require('../data/parents');

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
const STUDENT_ROLE = 3;
const PARENT_ROLE = 4;

// One student's grades (by-student): Admin and Assistant Principal read
// any student, a parent reads their own children only (400 otherwise).
const REPORT_STAFF_ROLES = [0, 1];

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
//    the students of a sheet are the ACTIVE, not graduated students whose
//    classId and sectionId are the assignment's (data/students.js), in
//    every term. An inactive assignment has no students.
// 2. Only the sheet, the bulk save, a mark's history and one student's
//    grades (by-student, me) are built. GET/POST/PUT of a single grade
//    answer 404 here.
// 3. Saving marks also updates the flags the other mocks use for "marks
//    exist": plan.isLocked, plan.hasGrades, component.hasMarks and
//    assessment.hasMarks (so the plans and assessments pages agree).
// 4. The text of the messages is not the real text.
// 5. A closed term (data/academic-terms.js, areGradesClosed) blocks only
//    the bulk save here. The other mocks (plans, assessments, assignments,
//    placements) do not check it.
// 6. One student's grades (by-student, me): the terms of a student are the
//    terms that have a subject plan for the student's class (the mock keeps
//    the same class and section in every term, see 1). The subjects are
//    those plans; a subject with no active assignment in the student's
//    section has no teacher (hasTeacher: false). The status of a term's
//    record is 0, except:
//      - a graduated student (studentStatus 2) has no record in the
//        current term (the rollover graduated them before it),
//      - studentStatus 1 or 3 is the status of the current term's record,
//      - MOCK_RECORD_STATUS below.


// =====================================================
// SEED: marks added the first time a sheet is read
// =====================================================
//
// The marks follow the students of the section sorted by studentId
// (null = no mark). Assessments are found by their English name
// (Quiz 1, First exam, Final exam...). termId: the current term
// unless the item says otherwise.
//
// Things to try (log in as "teacher", then Grades):
// - Arabic · Class 1 / A: quizzes 1-2 and the first exam have marks,
//   Quiz 3 and the final exam don't → every student is "Incomplete".
//   Type the missing marks and save to see the totals.
// - Arabic · Class 1 / B: every mark exists → totals, one student fails.
// - Arabic · Class 2 / A: no quizzes yet → "No assessment yet" column.
// As "admin": Science · Class 1 / A (plan 80 of 100) → read-only sheet.
// As "assistant": any sheet is view only.
//
// Closed term and history (log in as "admin", then Grades):
// - Term 4 (Second Term 2025/2026, closed by the rollover) · Class 1 / A ·
//   Arabic: read-only sheet with the "grades are closed" note.
// - The blue history icon (see SEED_EDITS): open it to see the changes.
// - Close term 5 on the academic years page: every current-term sheet
//   becomes read-only, and "Save sheet" answers 400.
const CURRENT_TERM = 5;
const PREVIOUS_TERM = 4;

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
  },
  {
    // Islamic Education · Class 1 / A: every mark exists → totals.
    // Student 2 (the "student" login and the "parent" login's child): 86, passed.
    classId: 1, sectionId: 1, subjectId: 5,
    marks: {
      'Recitation: Al-Fatiha': [9, 7, 10, 4],
      'Final exam': [50, 44, 57, 18]
    }
  },
  {
    termId: PREVIOUS_TERM,
    classId: 1, sectionId: 1, subjectId: 1, // Arabic · Class 1 / A, term 4 (closed)
    marks: {
      'First exam': [15, 12, 19, 10],
      'Final exam': [45, 38, 55, 30]
    }
  }
];

// Seeded marks that were changed after they were entered (the history).
// student: position in the section (sorted by studentId), like SEED.
// changes: newest first (same order as the real API). The mark in SEED is
// the newest mark. changes: [] with editedAt = a change made before the
// backend kept the history (only the last edit is known).
const SEED_EDITS = [
  {
    classId: 1, sectionId: 2, subjectId: 1, assessment: 'Quiz 1', student: 0,
    recordedAt: '2026-10-15T08:30:00',
    changes: [
      { oldMark: 10, newMark: 9, changedByUserId: 1, changedAt: '2026-10-18T09:40:00' },
      { oldMark: 7, newMark: 10, changedByUserId: 3, changedAt: '2026-10-16T07:05:00' }
    ]
  },
  {
    classId: 1, sectionId: 1, subjectId: 1, assessment: 'First exam', student: 1,
    recordedAt: '2026-10-15T08:30:00',
    changes: [],
    editedByUserId: 3,
    editedAt: '2026-10-17T11:20:00'
  },
  {
    // Student 2's recitation: the edited mark of the "Grades" tab and pages.
    classId: 1, sectionId: 1, subjectId: 5, assessment: 'Recitation: Al-Fatiha', student: 0,
    recordedAt: '2026-10-15T08:30:00',
    changes: [
      { oldMark: 8, newMark: 9, changedByUserId: 3, changedAt: '2026-10-19T10:15:00' }
    ]
  },
  {
    termId: PREVIOUS_TERM,
    classId: 1, sectionId: 1, subjectId: 1, assessment: 'Final exam', student: 0,
    recordedAt: '2026-06-20T07:00:00',
    changes: [
      { oldMark: 40, newMark: 45, changedByUserId: 1, changedAt: '2026-06-25T08:00:00' }
    ]
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


// 401 / 403 with a body, like the real backend (since 2026-10-16).
// 401 logs the user out (auth-interceptor); 403 shows the message.
function sendEmpty(res, statusCode) {

  if (statusCode === 401) {
    sendError(res, 401, 'يجب تسجيل الدخول.', 'You must log in.');
    return;
  }

  sendError(res, statusCode, 'ليس لديك صلاحية لتنفيذ هذا الإجراء.', 'You do not have permission to do this.');
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
  return new Date().toISOString().slice(0, 19);
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


// The term's grades are closed (data/academic-terms.js): nothing changes.
function areGradesClosed(assignment) {

  const term = academicTerms.find(
    t => t.academicTermId === assignment.academicTermId
  );

  return !!term && term.areGradesClosed === true;
}


const GRADES_CLOSED_ERROR = [
  'علامات هذا الفصل مغلقة. لا يمكن تغيير العلامات أو التقييمات أو خطط المواد حتى يفتحها مدير النظام.',
  "This term's grades are closed. Grades, assessments and subject plans cannot change until an administrator reopens them."
];


// "First name + family name" of a user (Arabic or English), like the
// names in the real history. Users first, then teachers (same userId).
function userName(userId, lang) {

  const person =
    users.find(u => u.userId === userId) ||
    teachers.find(t => t.userId === userId);

  if (!person) {
    return '';
  }

  return [person[`firstName${lang}`], person[`familyName${lang}`]]
    .map(part => String(part || '').trim())
    .filter(part => part !== '')
    .join(' ');
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

  // A graduated student (studentStatus 2) has no placement any more.
  return students.filter(s =>
    s.isActive &&
    s.studentStatus !== 2 &&
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


// The section of a SEED / SEED_EDITS item: its assignment, plan,
// students (by studentId) and assessments. null when it does not exist.
function seedSection(item) {

  const termId = item.termId || CURRENT_TERM;

  const assignment = teacherAssignments.find(a =>
    a.academicTermId === termId &&
    a.classId === item.classId &&
    a.sectionId === item.sectionId &&
    a.subjectId === item.subjectId
  );

  const plan = assignment ? findPlan(assignment) : undefined;

  if (!assignment || !plan) {
    return null;
  }

  return {
    plan,
    students: enrolledStudents(assignment).sort((a, b) => a.studentId - b.studentId),
    list: sectionAssessments(assignment, plan)
  };
}


// Adds the SEED marks once, then the SEED_EDITS history.
//
// Every stored mark also keeps its history (only the mock stores it there):
//   changes: [{ oldMark, newMark, changedByUserId, changedAt }], newest first.
function seedOnce() {

  if (seeded) {
    return;
  }

  seeded = true;

  for (const item of SEED) {

    const section = seedSection(item);

    if (!section) {
      continue;
    }

    for (const [nameEn, marks] of Object.entries(item.marks)) {

      const assessment = section.list.find(a => a.nameEn === nameEn);

      if (!assessment) {
        continue;
      }

      section.students.forEach((student, index) => {

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
          editedAt: null,
          changes: []
        });

        markHasMarks(assessment, section.plan);
      });
    }
  }

  for (const edit of SEED_EDITS) {

    const section = seedSection(edit);
    const assessment = section && section.list.find(a => a.nameEn === edit.assessment);
    const student = section && section.students[edit.student];
    const grade = assessment && student && findGrade(student.studentId, assessment.assessmentId);

    if (!grade) {
      continue;
    }

    const last = edit.changes[0];

    grade.recordedAt = edit.recordedAt;
    grade.changes = edit.changes.map(change => ({ ...change }));
    grade.editedByUserId = last ? last.changedByUserId : edit.editedByUserId;
    grade.editedAt = last ? last.changedAt : edit.editedAt;
  }
}


// The history of one stored mark (same shape as the real API).
function buildHistory(grade) {

  const name = (userId, lang) => userId === null ? null : userName(userId, lang);

  return {
    studentGradeId: grade.studentGradeId,
    mark: grade.mark,

    recordedByUserId: grade.recordedByUserId,
    recordedByNameAr: name(grade.recordedByUserId, 'Ar'),
    recordedByNameEn: name(grade.recordedByUserId, 'En'),
    recordedAt: grade.recordedAt,

    editedByUserId: grade.editedByUserId,
    editedByNameAr: name(grade.editedByUserId, 'Ar'),
    editedByNameEn: name(grade.editedByUserId, 'En'),
    editedAt: grade.editedAt,

    changes: (grade.changes || []).map(change => ({
      oldMark: change.oldMark,
      newMark: change.newMark,
      changedByUserId: change.changedByUserId,
      changedByNameAr: userName(change.changedByUserId, 'Ar'),
      changedByNameEn: userName(change.changedByUserId, 'En'),
      changedAt: change.changedAt
    }))
  };
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
  const closed = areGradesClosed(assignment);

  const sheetStudents = enrolledStudents(assignment)
    .map(student => {

      const marks = list.map(a => {
        const grade = findGrade(student.studentId, a.assessmentId);
        return {
          assessmentId: a.assessmentId,
          studentGradeId: grade ? grade.studentGradeId : null,
          mark: grade ? grade.mark : null,

          // Changed after it was first entered.
          isEdited: !!(grade && grade.editedAt)
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

    // A closed term: the sheet is read-only for everyone.
    areGradesClosed: closed,
    canEnterGrades: ready && !closed,

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


// =====================================================
// One student's grades (by-student, me). See ASSUMPTIONS 6.
// =====================================================
//
// Things to try:
// - "student" login → Grades: student 2 (Class 1 / A), current term only.
//   Islamic Education is complete (86, passed, its recitation was edited),
//   Arabic has some marks, Art Education and Computer have no teacher.
// - "parent" login → Grades: children 2 and 8 (Class 1 / B, Arabic 88).
//   To see a graduated child: as "admin", Parents → parent 1 → link
//   student 7 (graduated), then log in as "parent" again.
// - "admin" → Students → student 2 → Grades tab: terms 5 and 4 (closed).
//   Students 14, 32 and 50 (Class 1 / C): record status 1, 3 and 2 in the
//   current term → the status message instead of the cards.

// The "student" login of data/users.js (userId 4) has no student record
// (students start at userId 10), so it reads student 2 here.
// Other students are found by their own userId.
const MOCK_STUDENT_LINKS = { 4: 2 };

// Record status by student and term (only for trying the messages).
const MOCK_RECORD_STATUS = {
  14: { [CURRENT_TERM]: 1 },
  32: { [CURRENT_TERM]: 3 },
  50: { [CURRENT_TERM]: 2 }
};

const GRADUATED_STATUS = 2;


function findStudentOfUser(user) {

  const linkedId = MOCK_STUDENT_LINKS[user.userId];

  return students.find(s =>
    linkedId !== undefined
      ? s.studentId === linkedId
      : s.userId === user.userId
  ) || null;
}


function isChildOfParent(user, studentId) {

  const parent = parents.find(p => p.userId === user.userId);

  return !!parent && parentStudents.some(link =>
    link.parentId === parent.parentId && link.studentId === studentId
  );
}


// The status of the student's record in one term (ASSUMPTIONS 6).
function recordStatus(student, term) {

  const override = MOCK_RECORD_STATUS[student.studentId];

  if (override && override[term.academicTermId] !== undefined) {
    return override[term.academicTermId];
  }

  if (term.isCurrent && student.studentStatus !== GRADUATED_STATUS) {
    return student.studentStatus;
  }

  return 0;
}


// The terms the student has a record in, newest first.
function studentTerms(student) {

  return academicTerms
    .filter(term =>
      subjectPlans.some(p =>
        p.academicTermId === term.academicTermId &&
        p.classId === student.classId
      )
    )
    .filter(term =>
      !(term.isCurrent && student.studentStatus === GRADUATED_STATUS)
    )
    .sort((a, b) => b.academicTermId - a.academicTermId);
}


// One subject of the student in one term (same formula as buildSheet).
function buildStudentSubject(student, term, plan) {

  const subject = subjects.find(s => s.subjectId === plan.subjectId);

  const assignment = teacherAssignments.find(a =>
    a.isActive &&
    a.academicTermId === term.academicTermId &&
    a.classId === student.classId &&
    a.sectionId === student.sectionId &&
    a.subjectId === plan.subjectId
  );

  const base = {
    subjectId: plan.subjectId,
    subjectAr: subject ? subject.subjectAr : '',
    subjectEn: subject ? subject.subjectEn : '',
    passingMark: plan.passingMark
  };

  // In the class's plan, but nobody teaches it in this section.
  if (!assignment) {
    return {
      ...base,
      hasTeacher: false,
      teacherAssignmentId: null,
      teacherNameAr: null,
      teacherNameEn: null,
      total: null,
      isPassed: null,
      components: []
    };
  }

  const teacher = teachers.find(t => t.teacherId === assignment.teacherId);
  const list = sectionAssessments(assignment, plan);

  const components = sortedComponents(plan).map(component => {

    const own = list.filter(
      a => a.subjectPlanComponentId === component.subjectPlanComponentId
    );

    const rows = own.map(a => {

      const grade = findGrade(student.studentId, a.assessmentId);

      return {
        assessmentId: a.assessmentId,
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        maxMark: a.maxMark,
        studentGradeId: grade ? grade.studentGradeId : null,
        mark: grade ? grade.mark : null,
        isEdited: !!(grade && grade.editedAt)
      };
    });

    const complete = rows.length > 0 && rows.every(r => r.mark !== null);

    return {
      subjectPlanComponentId: component.subjectPlanComponentId,
      nameAr: component.nameAr,
      nameEn: component.nameEn,
      weight: component.weight,
      score: complete
        ? round2(rows.reduce((sum, r) => sum + r.mark / r.maxMark, 0) / rows.length * component.weight)
        : null,
      assessments: rows
    };
  });

  const ready = canEnterGrades(plan)
    && components.length > 0
    && components.every(c => c.score !== null);

  const total = ready
    ? round2(components.reduce((sum, c) => sum + c.score, 0))
    : null;

  return {
    ...base,
    hasTeacher: true,
    teacherAssignmentId: assignment.teacherAssignmentId,
    teacherNameAr: teacher ? `${teacher.firstNameAr} ${teacher.familyNameAr}` : null,
    teacherNameEn: teacher ? `${teacher.firstNameEn} ${teacher.familyNameEn}` : null,
    total,
    isPassed: total === null ? null : total >= plan.passingMark,
    components
  };
}


function buildStudentTerm(student, term) {

  const year = academicYears.find(y => y.academicYearId === term.academicYearId);
  const schoolClass = schoolClasses.find(c => c.schoolClassId === student.classId);
  const section = sections.find(s => s.sectionId === student.sectionId);
  const status = recordStatus(student, term);

  const plans = subjectPlans
    .filter(p =>
      p.academicTermId === term.academicTermId &&
      p.classId === student.classId
    )
    .sort((a, b) => a.subjectId - b.subjectId);

  return {
    academicTermId: term.academicTermId,
    termNameAr: term.nameAr,
    termNameEn: term.nameEn,
    yearName: year ? year.yearName : '',
    isCurrent: term.isCurrent,

    classId: student.classId,
    classNameAr: schoolClass ? schoolClass.classNameAr : '',
    classNameEn: schoolClass ? schoolClass.classNameEn : '',

    sectionId: student.sectionId,
    sectionAr: section ? section.sectionAr : '',
    sectionEn: section ? section.sectionEn : '',

    studentStatus: status,
    areGradesClosed: term.areGradesClosed === true,

    // Not active in that term: the marks are kept, but not returned.
    subjects: status === 0
      ? plans.map(plan => buildStudentSubject(student, term, plan))
      : []
  };
}


// currentOnly and academicTermId together → an error (400).
function readReportQuery(url) {

  const currentOnly = (url.searchParams.get('currentOnly') || '').toLowerCase() === 'true';
  const termParam = url.searchParams.get('academicTermId');

  if (currentOnly && termParam !== null) {
    return {
      error: [
        'لا يمكن استخدام currentOnly و academicTermId معًا.',
        'currentOnly and academicTermId cannot be used together.'
      ]
    };
  }

  return {
    currentOnly,
    academicTermId: termParam !== null ? Number(termParam) : null
  };
}


function buildStudentReport(student, query) {

  const terms = studentTerms(student)
    .filter(term => !query.currentOnly || term.isCurrent)
    .filter(term => query.academicTermId === null || term.academicTermId === query.academicTermId);

  return {
    studentId: student.studentId,
    studentNumber: student.studentNumber,
    studentNameAr: fullName(student, 'Ar'),
    studentNameEn: fullName(student, 'En'),
    terms: terms.map(term => buildStudentTerm(student, term))
  };
}


const STUDENT_NOT_FOUND = ['الطالب غير موجود.', 'Student not found.'];


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

  // =====================================================
  // GET /api/studentgrades/by-student/{studentId}
  // Admin, Assistant Principal (any student), Parent (own children).
  // =====================================================

  const byStudentMatch = pathname.match(/^\/api\/studentgrades\/by-student\/(\d+)$/);

  if (req.method === 'GET' && byStudentMatch) {

    const isParent = currentUser.role === PARENT_ROLE;

    if (!isParent && !REPORT_STAFF_ROLES.includes(currentUser.role)) {
      sendEmpty(res, 403);
      return;
    }

    const query = readReportQuery(url);

    if (query.error) {
      sendError(res, 400, query.error[0], query.error[1]);
      return;
    }

    const student = students.find(s => s.studentId === Number(byStudentMatch[1]));

    if (!student) {
      sendError(res, 404, STUDENT_NOT_FOUND[0], STUDENT_NOT_FOUND[1]);
      return;
    }

    if (isParent && !isChildOfParent(currentUser, student.studentId)) {
      sendError(res, 400, 'يمكنك فقط عرض علامات أبنائك.', 'You can only view the grades of your own children.');
      return;
    }

    seedOnce();

    sendOk(res, 200, 'تم جلب علامات الطالب بنجاح', 'Student grades retrieved successfully', buildStudentReport(student, query));
    return;
  }


  // =====================================================
  // GET /api/studentgrades/me (Student)
  // =====================================================

  if (req.method === 'GET' && pathname === '/api/studentgrades/me') {

    if (currentUser.role !== STUDENT_ROLE) {
      sendEmpty(res, 403);
      return;
    }

    const query = readReportQuery(url);

    if (query.error) {
      sendError(res, 400, query.error[0], query.error[1]);
      return;
    }

    const student = findStudentOfUser(currentUser);

    if (!student) {
      sendError(res, 404, STUDENT_NOT_FOUND[0], STUDENT_NOT_FOUND[1]);
      return;
    }

    seedOnce();

    sendOk(res, 200, 'تم جلب علاماتك بنجاح', 'Your grades were retrieved successfully', buildStudentReport(student, query));
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
  // GET /api/studentgrades/{studentGradeId}/history
  // Who entered the mark, the last edit and every change (newest first).
  // Can always be read, also when the term's grades are closed.
  // =====================================================

  const historyMatch = pathname.match(/^\/api\/studentgrades\/(\d+)\/history$/);

  if (req.method === 'GET' && historyMatch) {

    const grade = studentGrades.find(
      g => g.studentGradeId === Number(historyMatch[1])
    );

    if (!grade) {
      sendError(res, 404, 'العلامة غير موجودة.', 'Grade not found.');
      return;
    }

    const assessment = assessments.find(a => a.assessmentId === grade.assessmentId);
    const assignment = assessment ? findAssignment(assessment.teacherAssignmentId) : null;

    if (assignment && !ownsAssignment(assignment)) {
      sendError(res, 400, NOT_OWNER_ERROR[0], NOT_OWNER_ERROR[1]);
      return;
    }

    sendOk(
      res,
      200,
      'تم جلب سجل العلامة بنجاح',
      'Grade history retrieved successfully',
      buildHistory(grade)
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

    // A closed term: nobody saves marks, the Admin included.
    if (areGradesClosed(assignment)) {
      sendError(res, 400, GRADES_CLOSED_ERROR[0], GRADES_CLOSED_ERROR[1]);
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
          editedAt: null,
          changes: []
        });

        created++;

      } else if (Number(grade.mark) === mark) {

        // The same mark again: not edited, no history row.
        unchanged++;

      } else {

        // Every change is kept in the history (newest first).
        grade.changes = grade.changes || [];

        grade.changes.unshift({
          oldMark: Number(grade.mark),
          newMark: mark,
          changedByUserId: currentUser.userId,
          changedAt: now
        });

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