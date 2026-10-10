const attendanceRecords = require('../data/attendance');
const students = require('../data/students');
const sections = require('../data/sections');
const schoolClasses = require('../data/school-classes');
const academicTerms = require('../data/academic-terms');
const users = require('../data/users');


// =====================================================
// Settings
// =====================================================

// Delay (in milliseconds) added to every attendance response.
// 0 = no delay. Try 500 or 2000 to see the loading states.
const DELAY_MS = 0;

// Roles that can call the attendance API at all:
// 0 = Admin, 1 = Assistant Principal, 2 = Teacher.
// Student (3) and Parent (4) have no attendance endpoints yet: 403.
const STAFF_ROLES = [0, 1, 2];

// Admin and Assistant Principal: any past day or today,
// plus by-student and by-date.
// (daily-summary is also open to the attendance officer, today only.)
const FULL_ACCESS_ROLES = [0, 1];

// The teacher who is the school's attendance officer (userId in data/users.js).
// 6 = the user "officer". The user "teacher2" is a normal teacher.
// Set it to null to test a school with no attendance officer.
// (The real backend keeps a teacherId in SchoolSettings.)
const ATTENDANCE_OFFICER_USER_ID = 6;

const STATUS_PRESENT = 0;
const STATUS_ABSENT = 1;


// =====================================================
// RULES (SMS API Reference - section 11)
// =====================================================
//
// 1. my-access (roles 0, 1, 2):
//      Admin / Assistant Principal -> canRecord: true,  todayOnly: false
//      The attendance officer      -> canRecord: true,  todayOnly: true
//      Any other teacher           -> canRecord: false, todayOnly: false
// 2. sheet / POST / PUT: Admin, Assistant Principal, the attendance officer.
//    A teacher who is not the officer gets 400.
//    The officer gets 400 for any day other than today.
// 3. by-student / by-date: Admin and Assistant Principal only.
//    A teacher (the officer included) gets 403.
//    daily-summary: Admin, Assistant Principal and the attendance officer.
//    The officer gets 400 for any day other than today.
//    A teacher who is not the officer gets 403.
// 4. A future date is rejected with 400, for everyone.
// 5. A date that no academic term covers is rejected with 400.
// 6. Recording a student twice on the same day is rejected with 400,
//    and so is the same studentId twice in one request.
//    All or nothing: the whole batch fails.
// 7. daily-summary: the date is optional (without it, today is used).
// 8. recordedAt / editedAt are UTC without a trailing "Z".
//
// ASSUMPTIONS (not taken from the real backend):
// - daily-summary is open to the attendance officer (today only).
//   The SMS API Reference says the officer gets 403 here, so the real
//   backend must be changed the same way before this works without the mock.
// - The sheet shows the ACTIVE students of the section (the real backend
//   reads them from StudentAcademicRecord in the term that covers the date).
// - The daily summary shows only ACTIVE sections of ACTIVE classes
//   that have at least one active student.
// - Weekend days are accepted.


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


function sendError(res, statusCode, messageAr, messageEn) {
  sendJson(res, statusCode, {
    success: false,
    messageAr,
    messageEn,
    data: null
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
// (Tokens are in data/users.js, for example: mock-admin-token)
function getCurrentUser(req) {

  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : '';

  return users.find(user => user.token === token) || null;
}


// Today as YYYY-MM-DD using the LOCAL date (same as the frontend).
function getToday() {

  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}


// True only for a real date written as YYYY-MM-DD.
function isValidDate(value) {

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}


function isValidStatus(status) {
  return (
    status === STATUS_PRESENT ||
    status === STATUS_ABSENT
  );
}


// The academic term that contains the date (or undefined).
function getTermByDate(date) {
  return academicTerms.find(
    term =>
      term.startDate.slice(0, 10) <= date &&
      date <= term.endDate.slice(0, 10)
  );
}


// Checks the date. Sends the error and returns null when it is not valid.
// Returns the academic term when the date is valid.
function validateDate(res, date) {

  if (!isValidDate(date)) {

    sendError(
      res,
      400,
      'التاريخ غير صالح',
      'Invalid date'
    );

    return null;
  }

  if (date > getToday()) {

    sendError(
      res,
      400,
      'لا يمكن تسجيل الحضور لتاريخ مستقبلي',
      'Attendance cannot be recorded for a future date'
    );

    return null;
  }

  const term = getTermByDate(date);

  if (!term) {

    sendError(
      res,
      400,
      'التاريخ المحدد لا يقع ضمن أي فصل دراسي',
      'The selected date is not inside any academic term'
    );

    return null;
  }

  return term;
}


function getSectionStudents(sectionId) {
  return students.filter(
    student =>
      student.sectionId === sectionId &&
      student.isActive === true
  );
}


function getStudentNameAr(student) {
  return [
    student.firstNameAr,
    student.fatherNameAr,
    student.grandFatherNameAr,
    student.familyNameAr
  ]
    .filter(Boolean)
    .join(' ');
}


function getStudentNameEn(student) {
  return [
    student.firstNameEn,
    student.fatherNameEn,
    student.grandFatherNameEn,
    student.familyNameEn
  ]
    .filter(Boolean)
    .join(' ');
}


function findRecord(studentId, date) {
  return attendanceRecords.find(
    record =>
      record.studentId === studentId &&
      record.date === date
  );
}


// The answer of GET /api/attendance/my-access for one user.
function getAccess(user) {

  if (FULL_ACCESS_ROLES.includes(user.role)) {
    return { canRecord: true, todayOnly: false };
  }

  if (
    user.role === 2 &&
    user.userId === ATTENDANCE_OFFICER_USER_ID
  ) {
    return { canRecord: true, todayOnly: true };
  }

  return { canRecord: false, todayOnly: false };
}


// Used by sheet / POST / PUT.
// Sends 400 and returns false when the user cannot work on that day.
function checkCanRecord(res, user, date) {

  const access = getAccess(user);

  if (!access.canRecord) {

    sendError(
      res,
      400,
      'المعلم ليس مسؤول الحضور',
      'The teacher is not the attendance officer'
    );

    return false;
  }

  if (access.todayOnly && date !== getToday()) {

    sendError(
      res,
      400,
      'مسؤول الحضور يستطيع تسجيل وتعديل حضور اليوم الحالي فقط',
      'The attendance officer can record and edit attendance for today only'
    );

    return false;
  }

  return true;
}


// Now in UTC without a trailing "Z" (like the real backend).
// Example: "2026-10-08T19:18:38.803"
function getUtcNow() {
  return new Date().toISOString().replace('Z', '');
}


// One saved record in the shape the API returns (AttendanceDto).
function toAttendanceDto(record) {

  const student = students.find(
    item => item.studentId === record.studentId
  );

  return {
    attendanceId: record.attendanceId,
    studentId: record.studentId,
    studentNumber: student ? student.studentNumber : '',
    studentFirstNameAr: student ? student.firstNameAr : '',
    studentFirstNameEn: student ? student.firstNameEn : '',
    academicTermId: record.academicTermId,
    date: record.date,
    status: record.status,
    recordedByUserId: record.recordedByUserId,
    recordedAt: record.recordedAt,
    editedByUserId: record.editedByUserId,
    editedAt: record.editedAt
  };
}


// =====================================================
// Attendance Routes
// =====================================================

function attendanceRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  // The frontend calls /api/attendance (small letters).
  // The path is compared in small letters so both forms work.
  const pathname = url.pathname.toLowerCase();


  // =====================================================
  // Only handle Attendance API
  // =====================================================

  if (
    pathname !== '/api/attendance' &&
    !pathname.startsWith('/api/attendance/')
  ) {
    return false;
  }


  if (DELAY_MS > 0) {

    setTimeout(
      () => handleAttendance(req, res, url, pathname),
      DELAY_MS
    );

  } else {

    handleAttendance(req, res, url, pathname);
  }

  return true;
}


function handleAttendance(req, res, url, pathname) {

  // =====================================================
  // Current user (from the token)
  // =====================================================

  const currentUser = getCurrentUser(req);

  if (!currentUser) {
    sendEmpty(res, 401);
    return;
  }

  // Student / Parent: no attendance endpoints yet.
  if (!STAFF_ROLES.includes(currentUser.role)) {
    sendEmpty(res, 403);
    return;
  }

  const hasFullAccess =
    FULL_ACCESS_ROLES.includes(currentUser.role);


  // =====================================================
  // GET /api/attendance/my-access
  // (Admin, Assistant Principal, Teacher)
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/attendance/my-access'
  ) {

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب صلاحيات الحضور بنجاح',
      messageEn: 'Attendance access retrieved successfully',
      data: getAccess(currentUser)
    });

    return;
  }


  // =====================================================
  // GET /api/attendance/by-student/{studentId}
  // (Admin, Assistant Principal)
  // One student's history in every term, oldest first.
  // =====================================================

  const byStudentMatch = pathname.match(
    /^\/api\/attendance\/by-student\/(\d+)$/
  );

  if (
    req.method === 'GET' &&
    byStudentMatch
  ) {

    if (!hasFullAccess) {
      sendEmpty(res, 403);
      return;
    }

    const studentId = Number(byStudentMatch[1]);

    const studentExists = students.some(
      student => student.studentId === studentId
    );

    if (!studentExists) {

      sendError(
        res,
        404,
        'الطالب غير موجود',
        'Student not found'
      );

      return;
    }

    const history = attendanceRecords
      .filter(record => record.studentId === studentId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(toAttendanceDto);

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب سجل حضور الطالب بنجاح',
      messageEn: 'Student attendance retrieved successfully',
      data: history
    });

    return;
  }


  // =====================================================
  // GET /api/attendance/by-date/{date}
  // (Admin, Assistant Principal)
  // Every student's record on one day.
  // =====================================================

  const byDateMatch = pathname.match(
    /^\/api\/attendance\/by-date\/([^/]+)$/
  );

  if (
    req.method === 'GET' &&
    byDateMatch
  ) {

    if (!hasFullAccess) {
      sendEmpty(res, 403);
      return;
    }

    const date = byDateMatch[1];

    if (!isValidDate(date)) {

      sendError(
        res,
        400,
        'التاريخ غير صالح',
        'Invalid date'
      );

      return;
    }

    const dayRecords = attendanceRecords
      .filter(record => record.date === date)
      .map(toAttendanceDto);

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب حضور اليوم بنجاح',
      messageEn: 'Attendance retrieved successfully',
      data: dayRecords
    });

    return;
  }


  // =====================================================
  // GET /api/attendance/sheet?date=..&classId=..&sectionId=..
  // (Admin, Assistant Principal, the attendance officer)
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/attendance/sheet'
  ) {

    const date = url.searchParams.get('date');

    const classId = Number(
      url.searchParams.get('classId')
    );

    const sectionId = Number(
      url.searchParams.get('sectionId')
    );


    const term = validateDate(res, date);

    if (!term) {
      return;
    }


    if (!checkCanRecord(res, currentUser, date)) {
      return;
    }


    const classExists = schoolClasses.some(
      schoolClass =>
        schoolClass.schoolClassId === classId
    );

    if (!classExists) {

      sendError(
        res,
        404,
        'الصف غير موجود',
        'School class not found'
      );

      return;
    }


    const section = sections.find(
      item => item.sectionId === sectionId
    );

    if (!section) {

      sendError(
        res,
        404,
        'الشعبة غير موجودة',
        'Section not found'
      );

      return;
    }


    if (section.classId !== classId) {

      sendError(
        res,
        400,
        'الشعبة لا تتبع الصف المحدد',
        'The selected section does not belong to the selected class'
      );

      return;
    }


    const sheetStudents = getSectionStudents(sectionId)
      .map(student => {

        const record = findRecord(student.studentId, date);

        return {
          studentId: student.studentId,
          studentNumber: student.studentNumber,
          studentNameAr: getStudentNameAr(student),
          studentNameEn: getStudentNameEn(student),

          // IMPORTANT: a student that is not recorded yet must have
          // null here (not a missing field). The frontend compares
          // the values with null.
          attendanceId: record ? record.attendanceId : null,
          status: record ? record.status : null
        };
      });


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب كشف الحضور بنجاح',
      messageEn: 'Attendance sheet retrieved successfully',
      data: {
        date,
        academicTermId: term.academicTermId,
        classId,
        sectionId,
        students: sheetStudents
      }
    });

    return;
  }


  // =====================================================
  // GET /api/attendance/daily-summary?date=..
  // (Admin, Assistant Principal, the attendance officer: today only)
  // date is optional: without it, today is used.
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/attendance/daily-summary'
  ) {

    const access = getAccess(currentUser);

    // A teacher who is not the attendance officer.
    if (!access.canRecord) {
      sendEmpty(res, 403);
      return;
    }

    const date =
      url.searchParams.get('date') || getToday();

    const term = validateDate(res, date);

    if (!term) {
      return;
    }

    if (access.todayOnly && date !== getToday()) {

      sendError(
        res,
        400,
        'مسؤول الحضور يستطيع عرض ملخص اليوم الحالي فقط',
        'The attendance officer can view the summary for today only'
      );

      return;
    }


    const summarySections = sections
      .filter(section => {

        const schoolClass = schoolClasses.find(
          item => item.schoolClassId === section.classId
        );

        return (
          section.isActive === true &&
          schoolClass !== undefined &&
          schoolClass.isActive === true
        );
      })
      .map(section => {

        // The counts come from the real students list,
        // not from section.studentCount.
        const sectionStudents =
          getSectionStudents(section.sectionId);

        const records = sectionStudents
          .map(student => findRecord(student.studentId, date))
          .filter(Boolean);

        return {
          classId: section.classId,
          classNameAr: section.classNameAr,
          classNameEn: section.classNameEn,
          sectionId: section.sectionId,
          sectionAr: section.sectionAr,
          sectionEn: section.sectionEn,
          studentCount: sectionStudents.length,
          recordedCount: records.length,
          absentCount: records.filter(
            record => record.status === STATUS_ABSENT
          ).length,
          isComplete:
            sectionStudents.length > 0 &&
            records.length === sectionStudents.length
        };
      })
      .filter(section => section.studentCount > 0);


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب ملخص الحضور بنجاح',
      messageEn: 'Attendance summary retrieved successfully',
      data: {
        date,
        academicTermId: term.academicTermId,
        totalSections: summarySections.length,
        completedSections: summarySections.filter(
          section => section.isComplete
        ).length,
        totalAbsent: summarySections.reduce(
          (total, section) => total + section.absentCount,
          0
        ),
        sections: summarySections
      }
    });

    return;
  }


  // =====================================================
  // POST /api/attendance
  // (Admin, Assistant Principal, the attendance officer for today only)
  // Body: { date, entries: [{ studentId, status }] }
  // All or nothing: one rejected student fails the whole batch.
  // =====================================================

  if (
    req.method === 'POST' &&
    pathname === '/api/attendance'
  ) {

    getRequestBody(req)
      .then(body => {

        const { date, entries } = body;


        if (
          !Array.isArray(entries) ||
          entries.length === 0
        ) {

          sendError(
            res,
            400,
            'يجب إرسال طالب واحد على الأقل',
            'At least one student must be sent'
          );

          return;
        }


        const term = validateDate(res, date);

        if (!term) {
          return;
        }


        if (!checkCanRecord(res, currentUser, date)) {
          return;
        }


        // -------------------------------------------------
        // The same studentId twice in one request: 400,
        // and the message lists the duplicated IDs.
        // -------------------------------------------------

        const duplicatedIds = [];

        entries.forEach((entry, index) => {

          const firstIndex = entries.findIndex(
            item => item.studentId === entry.studentId
          );

          if (
            firstIndex !== index &&
            !duplicatedIds.includes(entry.studentId)
          ) {
            duplicatedIds.push(entry.studentId);
          }
        });

        if (duplicatedIds.length > 0) {

          const ids = duplicatedIds.join(', ');

          sendError(
            res,
            400,
            `تم إرسال الطالب أكثر من مرة في نفس الطلب: ${ids}`,
            `The same student was sent more than once: ${ids}`
          );

          return;
        }


        // -------------------------------------------------
        // Check every entry BEFORE saving anything
        // -------------------------------------------------

        for (const entry of entries) {

          const student = students.find(
            item => item.studentId === entry.studentId
          );

          if (!student) {

            sendError(
              res,
              404,
              'الطالب غير موجود',
              'Student not found'
            );

            return;
          }


          if (!isValidStatus(entry.status)) {

            sendError(
              res,
              400,
              'حالة الحضور غير صالحة',
              'Invalid attendance status'
            );

            return;
          }


          if (findRecord(entry.studentId, date)) {

            sendError(
              res,
              400,
              'تم تسجيل حضور الطالب مسبقًا في هذا اليوم',
              'Attendance is already recorded for this student on this day'
            );

            return;
          }
        }


        // -------------------------------------------------
        // Save
        // -------------------------------------------------

        let nextId =
          attendanceRecords.length > 0
            ? Math.max(
                ...attendanceRecords.map(
                  record => record.attendanceId
                )
              ) + 1
            : 1;

        const recordedAt = getUtcNow();

        const createdRecords = [];

        for (const entry of entries) {

          const record = {
            attendanceId: nextId,
            studentId: entry.studentId,
            academicTermId: term.academicTermId,
            date,
            status: entry.status,
            recordedByUserId: currentUser.userId,
            recordedAt,
            editedByUserId: null,
            editedAt: null
          };

          attendanceRecords.push(record);
          createdRecords.push(record);

          nextId++;
        }


        // data = the records that were created (AttendanceDto[])
        sendJson(res, 201, {
          success: true,
          messageAr: 'تم تسجيل الحضور بنجاح',
          messageEn: 'Attendance recorded successfully',
          data: createdRecords.map(toAttendanceDto)
        });

      })
      .catch(() => {

        sendError(
          res,
          400,
          'بيانات الطلب غير صالحة',
          'Invalid request body'
        );

      });

    return;
  }


  // =====================================================
  // PUT /api/attendance/{attendanceId}
  // (Admin, Assistant Principal; the attendance officer
  //  for today's records only)
  // Body: { status }
  // =====================================================

  const attendanceIdMatch = pathname.match(
    /^\/api\/attendance\/(\d+)$/
  );

  if (
    req.method === 'PUT' &&
    attendanceIdMatch
  ) {

    const attendanceId =
      Number(attendanceIdMatch[1]);


    getRequestBody(req)
      .then(body => {

        const record = attendanceRecords.find(
          item => item.attendanceId === attendanceId
        );

        if (!record) {

          sendError(
            res,
            404,
            'سجل الحضور غير موجود',
            'Attendance record not found'
          );

          return;
        }


        // The officer cannot edit a record after its day ends.
        if (!checkCanRecord(res, currentUser, record.date)) {
          return;
        }


        if (!isValidStatus(body.status)) {

          sendError(
            res,
            400,
            'حالة الحضور غير صالحة',
            'Invalid attendance status'
          );

          return;
        }


        record.status = body.status;
        record.editedByUserId = currentUser.userId;
        record.editedAt = getUtcNow();


        sendJson(res, 200, {
          success: true,
          messageAr: 'تم تعديل الحضور بنجاح',
          messageEn: 'Attendance updated successfully',
          data: null
        });

      })
      .catch(() => {

        sendError(
          res,
          400,
          'بيانات الطلب غير صالحة',
          'Invalid request body'
        );

      });

    return;
  }


  // =====================================================
  // Unknown Attendance endpoint
  // =====================================================

  sendError(
    res,
    404,
    'نقطة النهاية غير موجودة',
    'Attendance endpoint not found'
  );
}


module.exports = attendanceRoutes;