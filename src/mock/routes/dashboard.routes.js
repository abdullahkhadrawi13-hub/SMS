const students = require('../data/students');
const users = require('../data/users');
const schoolClasses = require('../data/school-classes');
const sections = require('../data/sections');
const subjects = require('../data/subjects');
const academicTerms = require('../data/academic-terms');
const academicYears = require('../data/academic-years');
const { parents, parentStudents } = require('../data/parents');
const dashboardData = require('../data/dashboard');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every response.
// 0 = no delay. Try 2000 to see the loading state.
const DELAY_MS = 0;

// true = answer as if no term is current (currentTerm: null,
// attendance: null, latestMarks: []), to see the "no current term" message.
const NO_CURRENT_TERM = false;

// Extra children shown on the "parent" account's home page, only to try
// the "الأبناء السابقون" button: student 7 is graduated (studentStatus 2).
// The real links stay in data/parents.js. [] = none.
const EXTRA_CHILDREN_OF_PARENT_1 = [7];

const STUDENT_ROLE = 3;
const PARENT_ROLE = 4;

// The "student" account (userId 4) has no student row of its own:
// it is student 2, like in routes/student-grades.routes.js.
const MOCK_STUDENT_LINKS = { 4: 2 };


// =====================================================
// Helpers
// =====================================================

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode);
  res.end(JSON.stringify(body));
}

function sendError(res, statusCode, messageAr, messageEn) {
  sendJson(res, statusCode, { success: false, messageAr, messageEn, data: null });
}

function sendOk(res, messageAr, messageEn, data) {
  sendJson(res, 200, { success: true, messageAr, messageEn, data });
}

// The user is found by the token sent in the Authorization header.
function getCurrentUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return users.find(user => user.token === token) || null;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getCurrentTerm() {
  if (NO_CURRENT_TERM) {
    return null;
  }

  const term = academicTerms.find(t => t.isCurrent);

  if (!term) {
    return null;
  }

  const year = academicYears.find(y => y.academicYearId === term.academicYearId);

  return {
    academicTermId: term.academicTermId,
    termNameAr: term.nameAr,
    termNameEn: term.nameEn,
    yearName: year ? year.yearName : ''
  };
}


// One student's card (StudentDashboardCard).
// Name = first + father + family name, like the real API.
function buildCard(student) {

  const schoolClass = schoolClasses.find(c => c.schoolClassId === student.classId);
  const section = sections.find(s => s.sectionId === student.sectionId);
  const currentTerm = getCurrentTerm();

  // A graduated, inactive or transferred student has no records
  // in the current term.
  const isActive = student.studentStatus === 0;
  const data = (isActive && dashboardData[student.studentId]) || null;

  let attendance = null;
  let latestMarks = [];

  if (currentTerm) {

    const present = data ? data.attendance.presentCount : 0;
    const absent = data ? data.attendance.absentCount : 0;
    const last = data ? data.attendance.lastAbsenceDate : null;

    attendance = {
      presentCount: present,
      absentCount: absent,
      totalRecorded: present + absent,
      lastAbsenceDate: last === 'TODAY' ? today() : last
    };

    latestMarks = (data ? data.latestMarks : []).map(mark => {
      const subject = subjects.find(s => s.subjectId === mark.subjectId);

      return {
        subjectAr: subject ? subject.subjectAr : '',
        subjectEn: subject ? subject.subjectEn : '',
        assessmentNameAr: mark.assessmentNameAr,
        assessmentNameEn: mark.assessmentNameEn,
        mark: mark.mark,
        maxMark: mark.maxMark,
        savedAt: mark.savedAt,
        isEdited: mark.isEdited
      };
    });
  }

  return {
    studentId: student.studentId,
    studentNumber: student.studentNumber,
    studentNameAr: `${student.firstNameAr} ${student.fatherNameAr} ${student.familyNameAr}`,
    studentNameEn: `${student.firstNameEn} ${student.fatherNameEn} ${student.familyNameEn}`,
    classNameAr: schoolClass ? schoolClass.classNameAr : '',
    classNameEn: schoolClass ? schoolClass.classNameEn : '',
    sectionAr: section ? section.sectionAr : '',
    sectionEn: section ? section.sectionEn : '',
    studentStatus: student.studentStatus,
    currentTerm,
    attendance,
    latestMarks
  };
}


// =====================================================
// Routes
//   GET /api/dashboard/student/me (Student)
//   GET /api/dashboard/parent/me  (Parent)
// =====================================================

function handleDashboard(req, res, pathname) {

  const currentUser = getCurrentUser(req);

  if (!currentUser) {
    sendError(res, 401, 'يجب تسجيل الدخول.', 'You must log in.');
    return;
  }

  if (pathname === '/api/dashboard/student/me') {

    if (currentUser.role !== STUDENT_ROLE) {
      sendError(res, 403, 'ليس لديك صلاحية لتنفيذ هذا الإجراء.', 'You do not have permission to do this.');
      return;
    }

    const linkedId = MOCK_STUDENT_LINKS[currentUser.userId];
    const student = students.find(s =>
      linkedId !== undefined ? s.studentId === linkedId : s.userId === currentUser.userId
    );

    if (!student) {
      sendError(res, 404, 'الطالب غير موجود.', 'Student not found.');
      return;
    }

    sendOk(res, 'تم جلب لوحة الطالب بنجاح.', 'Student dashboard retrieved successfully.', buildCard(student));
    return;
  }

  if (pathname === '/api/dashboard/parent/me') {

    if (currentUser.role !== PARENT_ROLE) {
      sendError(res, 403, 'ليس لديك صلاحية لتنفيذ هذا الإجراء.', 'You do not have permission to do this.');
      return;
    }

    const parent = parents.find(p => p.userId === currentUser.userId);

    if (!parent) {
      sendError(res, 404, 'ولي الأمر غير موجود.', 'Parent not found.');
      return;
    }

    const ids = parentStudents
      .filter(link => link.parentId === parent.parentId)
      .map(link => link.studentId);

    if (parent.parentId === 1) {
      ids.push(...EXTRA_CHILDREN_OF_PARENT_1.filter(id => !ids.includes(id)));
    }

    // Active children first, then by studentId (like the real API).
    const children = students
      .filter(s => ids.includes(s.studentId))
      .sort((a, b) =>
        (a.studentStatus === 0 ? 0 : 1) - (b.studentStatus === 0 ? 0 : 1)
        || a.studentId - b.studentId
      )
      .map(buildCard);

    sendOk(res, 'تم جلب لوحة ولي الأمر بنجاح.', 'Parent dashboard retrieved successfully.', { children });
    return;
  }

  sendError(res, 404, 'غير موجود.', 'Not found.');
}


function dashboardRoutes(req, res) {

  const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = url.pathname.toLowerCase();

  if (!pathname.startsWith('/api/dashboard/')) {
    return false;
  }

  if (req.method !== 'GET') {
    sendError(res, 405, 'الطريقة غير مسموحة.', 'Method not allowed.');
    return true;
  }

  if (DELAY_MS > 0) {
    setTimeout(() => handleDashboard(req, res, pathname), DELAY_MS);
  } else {
    handleDashboard(req, res, pathname);
  }

  return true;
}

module.exports = dashboardRoutes;
