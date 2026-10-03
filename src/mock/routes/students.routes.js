const students = require('../data/students');
const sections = require('../data/sections');
const schoolClasses = require('../data/school-classes');


function sendJson(res, statusCode, body) {
  res.writeHead(statusCode);
  res.end(JSON.stringify(body));
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


// =====================================================
// Students Routes
// =====================================================

function studentsRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  const pathname = url.pathname;


  // =====================================================
  // Only handle Students API
  // =====================================================

  if (!pathname.startsWith('/api/Students')) {
    return false;
  }


  // =====================================================
  // GET /api/Students/{id}
  // Get student by ID
  // =====================================================

  const studentIdMatch = pathname.match(
    /^\/api\/Students\/(\d+)$/
  );


  if (
    req.method === 'GET' &&
    studentIdMatch
  ) {

    const studentId =
      Number(studentIdMatch[1]);


    const student =
      students.find(
        item =>
          item.studentId === studentId
      );


    if (!student) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الطالب غير موجود',
        messageEn: 'Student not found',
        data: null
      });

      return true;
    }


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب بيانات الطالب بنجاح',
      messageEn: 'Student retrieved successfully',
      data: student
    });

    return true;
  }


  // =====================================================
  // GET /api/Students
  // Get students with pagination + filters + search
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/Students'
  ) {

    const pageNumber = Math.max(
      Number(
        url.searchParams.get('pageNumber')
      ) || 1,
      1
    );


    const pageSize = Math.max(
      Number(
        url.searchParams.get('pageSize')
      ) || 10,
      1
    );


    const search =
      url.searchParams.get('search');

    const classId =
      url.searchParams.get('classId');

    const sectionId =
      url.searchParams.get('sectionId');

    const isActive =
      url.searchParams.get('isActive');


    let filteredStudents =
      [...students];


    // ===================================================
    // Search
    // ===================================================

    if (search) {

      const searchValue =
        search.toLowerCase().trim();


      filteredStudents =
        filteredStudents.filter(student => {

          const fullNameAr = [
            student.firstNameAr,
            student.fatherNameAr,
            student.grandFatherNameAr,
            student.familyNameAr
          ]
            .filter(Boolean)
            .join(' ');


          const fullNameEn = [
            student.firstNameEn,
            student.fatherNameEn,
            student.grandFatherNameEn,
            student.familyNameEn
          ]
            .filter(Boolean)
            .join(' ');


          const values = [

            student.studentNumber,

            // Arabic name
            student.firstNameAr,
            student.fatherNameAr,
            student.grandFatherNameAr,
            student.familyNameAr,
            fullNameAr,

            // English name
            student.firstNameEn,
            student.fatherNameEn,
            student.grandFatherNameEn,
            student.familyNameEn,
            fullNameEn,

            // Other fields
            student.loginId,
            student.phoneNumber
          ];


          return values.some(
            value =>
              String(value)
                .toLowerCase()
                .includes(searchValue)
          );

        });
    }


    // ===================================================
    // Class filter
    // ===================================================

    if (classId !== null) {

      filteredStudents =
        filteredStudents.filter(
          student =>
            student.classId ===
            Number(classId)
        );
    }


    // ===================================================
    // Section filter
    // ===================================================

    if (sectionId !== null) {

      filteredStudents =
        filteredStudents.filter(
          student =>
            student.sectionId ===
            Number(sectionId)
        );
    }


    // ===================================================
    // Active / Inactive filter
    // ===================================================

    if (isActive !== null) {

      if (
        isActive !== 'true' &&
        isActive !== 'false'
      ) {

        sendJson(res, 400, {
          success: false,
          messageAr: 'قيمة حالة الطالب غير صالحة',
          messageEn: 'Invalid student active status',
          data: null
        });

        return true;
      }


      const active =
        isActive === 'true';


      filteredStudents =
        filteredStudents.filter(
          student =>
            student.isActive === active
        );
    }


    // ===================================================
    // Pagination
    // ===================================================

    const totalCount =
      filteredStudents.length;


    const totalPages =
      Math.ceil(
        totalCount / pageSize
      );


    const startIndex =
      (pageNumber - 1) * pageSize;


    const items =
      filteredStudents.slice(
        startIndex,
        startIndex + pageSize
      );


    // ===================================================
    // Response
    // ===================================================

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الطلاب بنجاح',
      messageEn: 'Students retrieved successfully',

      data: {
        items,
        totalCount,
        pageNumber,
        pageSize,
        totalPages
      }
    });

    return true;
  }


  // =====================================================
  // POST /api/Students
  // Create student
  // =====================================================

  if (
    req.method === 'POST' &&
    pathname === '/api/Students'
  ) {

    getRequestBody(req)
      .then(data => {

        // -------------------------------------------------
        // Required fields
        // -------------------------------------------------

        if (
          !data.firstNameAr ||
          !data.fatherNameAr ||
          !data.grandFatherNameAr ||
          !data.familyNameAr ||
          !data.firstNameEn ||
          !data.fatherNameEn ||
          !data.grandFatherNameEn ||
          !data.familyNameEn ||
          !data.loginId ||
          !data.temporaryPassword ||
          !data.phoneNumber ||
          data.classId === undefined ||
          data.sectionId === undefined
        ) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'جميع الحقول المطلوبة يجب إدخالها',
            messageEn: 'All required fields must be provided',
            data: null
          });

          return;
        }


        const numericClassId =
          Number(data.classId);

        const numericSectionId =
          Number(data.sectionId);


        // -------------------------------------------------
        // Validate class
        // -------------------------------------------------

        const schoolClass =
          schoolClasses.find(
            item =>
              item.schoolClassId ===
              numericClassId
          );


        if (!schoolClass) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'الصف غير موجود',
            messageEn: 'School class not found',
            data: null
          });

          return;
        }


        // -------------------------------------------------
        // Validate section
        // -------------------------------------------------

        const section =
          sections.find(
            item =>
              item.sectionId ===
              numericSectionId
          );


        if (!section) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'الشعبة غير موجودة',
            messageEn: 'Section not found',
            data: null
          });

          return;
        }


        // -------------------------------------------------
        // Validate class / section relationship
        // -------------------------------------------------

        if (
          section.classId !==
          numericClassId
        ) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'الشعبة لا تتبع الصف المحدد',
            messageEn:
              'The selected section does not belong to the selected class',
            data: null
          });

          return;
        }


        // -------------------------------------------------
        // Check duplicate Login ID
        // -------------------------------------------------

        const existingStudent =
          students.find(
            student =>
              student.loginId ===
              data.loginId
          );


        if (existingStudent) {

          sendJson(res, 409, {
            success: false,
            messageAr: 'رقم الدخول مستخدم مسبقًا',
            messageEn: 'Login ID already exists',
            data: null
          });

          return;
        }


        // -------------------------------------------------
        // Generate IDs
        // -------------------------------------------------

        const newStudentId =
          students.length > 0
            ? Math.max(
                ...students.map(
                  student =>
                    student.studentId
                )
              ) + 1
            : 1;


        const newUserId =
          students.length > 0
            ? Math.max(
                ...students.map(
                  student =>
                    student.userId
                )
              ) + 1
            : 11;


        const newStudentNumber =
          `STU${String(newStudentId).padStart(3, '0')}`;


        // -------------------------------------------------
        // Create student
        // -------------------------------------------------

        const newStudent = {

          studentId:
            newStudentId,

          studentNumber:
            newStudentNumber,

          userId:
            newUserId,

          firstNameAr:
            data.firstNameAr,

          fatherNameAr:
            data.fatherNameAr,

          grandFatherNameAr:
            data.grandFatherNameAr,

          familyNameAr:
            data.familyNameAr,

          firstNameEn:
            data.firstNameEn,

          fatherNameEn:
            data.fatherNameEn,

          grandFatherNameEn:
            data.grandFatherNameEn,

          familyNameEn:
            data.familyNameEn,

          loginId:
            data.loginId,

          phoneNumber:
            data.phoneNumber,

          isActive:
            true,

          mustChangePassword:
            true,

          classId:
            numericClassId,

          sectionId:
            numericSectionId,

          role:
            3
        };


        students.push(newStudent);


        sendJson(res, 201, {
          success: true,
          messageAr: 'تمت إضافة الطالب بنجاح',
          messageEn: 'Student created successfully',
          data: newStudent
        });

      })
      .catch(() => {

        sendJson(res, 400, {
          success: false,
          messageAr: 'بيانات الطلب غير صالحة',
          messageEn: 'Invalid request body',
          data: null
        });

      });


    return true;
  }


  // =====================================================
  // PUT /api/Students/{id}
  // Update student
  // =====================================================

  if (
    req.method === 'PUT' &&
    studentIdMatch
  ) {

    const studentId =
      Number(studentIdMatch[1]);


    const student =
      students.find(
        item =>
          item.studentId ===
          studentId
      );


    if (!student) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الطالب غير موجود',
        messageEn: 'Student not found',
        data: null
      });

      return true;
    }


    getRequestBody(req)
      .then(data => {

        // -------------------------------------------------
        // Required fields
        // -------------------------------------------------

        if (
          !data.firstNameAr ||
          !data.fatherNameAr ||
          !data.grandFatherNameAr ||
          !data.familyNameAr ||
          !data.firstNameEn ||
          !data.fatherNameEn ||
          !data.grandFatherNameEn ||
          !data.familyNameEn ||
          !data.loginId ||
          !data.phoneNumber ||
          data.classId === undefined ||
          data.sectionId === undefined
        ) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'جميع الحقول المطلوبة يجب إدخالها',
            messageEn: 'All required fields must be provided',
            data: null
          });

          return;
        }


        const numericClassId =
          Number(data.classId);

        const numericSectionId =
          Number(data.sectionId);


        // -------------------------------------------------
        // Validate class
        // -------------------------------------------------

        const schoolClass =
          schoolClasses.find(
            item =>
              item.schoolClassId ===
              numericClassId
          );


        if (!schoolClass) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'الصف غير موجود',
            messageEn: 'School class not found',
            data: null
          });

          return;
        }


        // -------------------------------------------------
        // Validate section
        // -------------------------------------------------

        const section =
          sections.find(
            item =>
              item.sectionId ===
              numericSectionId
          );


        if (!section) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'الشعبة غير موجودة',
            messageEn: 'Section not found',
            data: null
          });

          return;
        }


        // -------------------------------------------------
        // Validate class / section relationship
        // -------------------------------------------------

        if (
          section.classId !==
          numericClassId
        ) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'الشعبة لا تتبع الصف المحدد',
            messageEn:
              'The selected section does not belong to the selected class',
            data: null
          });

          return;
        }


        // -------------------------------------------------
        // Check duplicate Login ID
        // -------------------------------------------------

        const duplicate =
          students.find(
            otherStudent =>
              otherStudent.studentId !== studentId &&
              otherStudent.loginId === data.loginId
          );


        if (duplicate) {

          sendJson(res, 409, {
            success: false,
            messageAr: 'رقم الدخول مستخدم مسبقًا',
            messageEn: 'Login ID already exists',
            data: null
          });

          return;
        }


        // -------------------------------------------------
        // Update student
        // -------------------------------------------------

        student.firstNameAr =
          data.firstNameAr;

        student.fatherNameAr =
          data.fatherNameAr;

        student.grandFatherNameAr =
          data.grandFatherNameAr;

        student.familyNameAr =
          data.familyNameAr;


        student.firstNameEn =
          data.firstNameEn;

        student.fatherNameEn =
          data.fatherNameEn;

        student.grandFatherNameEn =
          data.grandFatherNameEn;

        student.familyNameEn =
          data.familyNameEn;


        student.loginId =
          data.loginId;

        student.phoneNumber =
          data.phoneNumber;


        student.classId =
          numericClassId;

        student.sectionId =
          numericSectionId;


        // -------------------------------------------------
        // Response
        // -------------------------------------------------

        sendJson(res, 200, {
          success: true,
          messageAr: 'تم تعديل بيانات الطالب بنجاح',
          messageEn: 'Student updated successfully',
          data: student
        });

      })
      .catch(() => {

        sendJson(res, 400, {
          success: false,
          messageAr: 'بيانات الطلب غير صالحة',
          messageEn: 'Invalid request body',
          data: null
        });

      });


    return true;
  }


  // =====================================================
  // PATCH /api/Students/{id}/status
  // Activate / Deactivate student
  // =====================================================

  if (
    req.method === 'PATCH'
  ) {

    const pathParts =
      pathname.split('/').filter(Boolean);


    // Expected:
    // /api/Students/{id}/status

    if (
      pathParts.length !== 4 ||
      pathParts[0] !== 'api' ||
      pathParts[1] !== 'Students' ||
      pathParts[3] !== 'status'
    ) {

      return false;
    }


    const studentId =
      Number(pathParts[2]);


    const student =
      students.find(
        item =>
          item.studentId ===
          studentId
      );


    if (!student) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الطالب غير موجود',
        messageEn: 'Student not found',
        data: null
      });

      return true;
    }


    // -------------------------------------------------
    // Validate isActive
    // -------------------------------------------------

    const isActive =
      url.searchParams.get('isActive');


    if (
      isActive !== 'true' &&
      isActive !== 'false'
    ) {

      sendJson(res, 400, {
        success: false,
        messageAr: 'قيمة حالة الطالب غير صالحة',
        messageEn: 'Invalid student active status',
        data: null
      });

      return true;
    }


    // -------------------------------------------------
    // Update status
    // -------------------------------------------------

    student.isActive =
      isActive === 'true';


    // -------------------------------------------------
    // Response
    // -------------------------------------------------

    sendJson(res, 200, {
      success: true,

      messageAr:
        student.isActive
          ? 'تم تفعيل الطالب بنجاح'
          : 'تم تعطيل الطالب بنجاح',

      messageEn:
        student.isActive
          ? 'Student activated successfully'
          : 'Student deactivated successfully',

      data: student
    });

    return true;
  }


  // =====================================================
  // Unknown Students endpoint
  // =====================================================

  sendJson(res, 404, {
    success: false,
    messageAr: 'نقطة النهاية غير موجودة',
    messageEn: 'Student endpoint not found',
    data: null
  });

  return true;
}


module.exports = studentsRoutes;