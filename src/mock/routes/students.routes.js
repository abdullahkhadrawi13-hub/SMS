const students = require('../data/students');

function studentsRoutes(req, res) {

  // =====================================================
  // GET /api/Students
  // Get students with pagination + filters + search
  // =====================================================

  if (
    req.method === 'GET' &&
    req.url.startsWith('/api/Students')
  ) {

    const url = new URL(
      req.url,
      'http://localhost:5253'
    );

    // ---------------------------------------------------
    // Get student by ID
    // ---------------------------------------------------

    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length === 3) {

      const studentId =
        Number(pathParts[2]);

      const student =
        students.find(
          student =>
            student.studentId === studentId
        );

      if (!student) {

        res.writeHead(404);

        res.end(
          JSON.stringify({
            success: false,
            message: 'Student not found',
            data: null
          })
        );

        return true;
      }

      res.writeHead(200);

      res.end(
        JSON.stringify({
          success: true,
          messageAr: 'تم جلب بيانات الطالب بنجاح',
          messageEn: 'Student retrieved successfully',
          data: student
        })
      );

      return true;
    }

    // ---------------------------------------------------
    // Pagination
    // ---------------------------------------------------

    const pageNumber =
      Number(url.searchParams.get('pageNumber')) || 1;

    const pageSize =
      Number(url.searchParams.get('pageSize')) || 10;

    // ---------------------------------------------------
    // Filters
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // Search
    // ---------------------------------------------------

    if (search) {

      const searchValue =
        search.toLowerCase().trim();

      filteredStudents =
        filteredStudents.filter(student => {

          const values = [
            student.studentNumber,
            student.firstNameAr,
            student.fatherNameAr,
            student.grandFatherNameAr,
            student.familyNameAr,

            student.firstNameEn,
            student.fatherNameEn,
            student.grandFatherNameEn,
            student.familyNameEn,

            student.loginId,
            student.phoneNumber
          ];

          return values.some(value =>
            String(value)
              .toLowerCase()
              .includes(searchValue)
          );

        });
    }

    // ---------------------------------------------------
    // Class filter
    // ---------------------------------------------------

    if (classId !== null) {

      filteredStudents =
        filteredStudents.filter(
          student =>
            student.classId ===
            Number(classId)
        );
    }

    // ---------------------------------------------------
    // Section filter
    // ---------------------------------------------------

    if (sectionId !== null) {

      filteredStudents =
        filteredStudents.filter(
          student =>
            student.sectionId ===
            Number(sectionId)
        );
    }

    // ---------------------------------------------------
    // Active filter
    // ---------------------------------------------------

    if (isActive !== null) {

      const active =
        isActive === 'true';

      filteredStudents =
        filteredStudents.filter(
          student =>
            student.isActive === active
        );
    }

    // ---------------------------------------------------
    // Pagination
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // Response
    // ---------------------------------------------------

    res.writeHead(200);

    res.end(
      JSON.stringify({
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
      })
    );

    return true;
  }


  // =====================================================
  // POST /api/Students
  // Create student
  // =====================================================

  if (
    req.method === 'POST' &&
    req.url === '/api/Students'
  ) {

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {

      try {

        const data =
          JSON.parse(body);

        // -----------------------------------------------
        // Basic validation
        // -----------------------------------------------

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

          !data.classId ||
          !data.sectionId
        ) {

          res.writeHead(400);

          res.end(
            JSON.stringify({
              success: false,
              message: 'Required fields are missing',
              data: null
            })
          );

          return;
        }

        // -----------------------------------------------
        // Check duplicate login ID
        // -----------------------------------------------

        const existingStudent =
          students.find(
            student =>
              student.loginId ===
              data.loginId
          );

        if (existingStudent) {

          res.writeHead(409);

          res.end(
            JSON.stringify({
              success: false,
              message: 'Login ID already exists',
              data: null
            })
          );

          return;
        }

        // -----------------------------------------------
        // Generate IDs
        // -----------------------------------------------

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

        // -----------------------------------------------
        // Create student
        // -----------------------------------------------

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
            Number(data.classId),

          sectionId:
            Number(data.sectionId),

          role:
            3
        };

        students.push(newStudent);

        res.writeHead(201);

        res.end(
          JSON.stringify({
            success: true,
            messageAr: 'تمت إضافة الطالب بنجاح',
            messageEn: 'Student created successfully',
            data: newStudent
          })
        );

      } catch {

        res.writeHead(400);

        res.end(
          JSON.stringify({
            success: false,
            message: 'Invalid request',
            data: null
          })
        );
      }
    });

    return true;
  }


  // =====================================================
  // PUT /api/Students/:id
  // Update student
  // =====================================================

  if (
    req.method === 'PUT' &&
    req.url.startsWith('/api/Students/')
  ) {

    const url =
      new URL(
        req.url,
        'http://localhost:5253'
      );

    const pathParts =
      url.pathname.split('/').filter(Boolean);

    const studentId =
      Number(pathParts[2]);

    const student =
      students.find(
        student =>
          student.studentId ===
          studentId
      );

    if (!student) {

      res.writeHead(404);

      res.end(
        JSON.stringify({
          success: false,
          message: 'Student not found',
          data: null
        })
      );

      return true;
    }

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {

      try {

        const data =
          JSON.parse(body);

        // -----------------------------------------------
        // Check duplicate login ID
        // -----------------------------------------------

        const duplicate =
          students.find(
            otherStudent =>
              otherStudent.studentId !== studentId &&
              otherStudent.loginId ===
                data.loginId
          );

        if (duplicate) {

          res.writeHead(409);

          res.end(
            JSON.stringify({
              success: false,
              message: 'Login ID already exists',
              data: null
            })
          );

          return;
        }

        // -----------------------------------------------
        // Update fields
        // -----------------------------------------------

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
          Number(data.classId);

        student.sectionId =
          Number(data.sectionId);

        // -----------------------------------------------
        // Response
        // -----------------------------------------------

        res.writeHead(200);

        res.end(
          JSON.stringify({
            success: true,
            messageAr: 'تم تعديل بيانات الطالب بنجاح',
            messageEn: 'Student updated successfully',
            data: student
          })
        );

      } catch {

        res.writeHead(400);

        res.end(
          JSON.stringify({
            success: false,
            message: 'Invalid request',
            data: null
          })
        );
      }
    });

    return true;
  }


  // =====================================================
  // PATCH /api/Students/:id/status
  // Activate / Deactivate student
  // =====================================================

  if (
    req.method === 'PATCH' &&
    req.url.startsWith('/api/Students/') &&
    req.url.endsWith('/status')
  ) {

    const url =
      new URL(
        req.url,
        'http://localhost:5253'
      );

    const pathParts =
      url.pathname.split('/').filter(Boolean);

    const studentId =
      Number(pathParts[2]);

    const isActive =
      url.searchParams.get('isActive');

    const student =
      students.find(
        student =>
          student.studentId ===
          studentId
      );

    if (!student) {

      res.writeHead(404);

      res.end(
        JSON.stringify({
          success: false,
          message: 'Student not found',
          data: null
        })
      );

      return true;
    }

    student.isActive =
      isActive === 'true';

    res.writeHead(200);

    res.end(
      JSON.stringify({
        success: true,
        messageAr: student.isActive
          ? 'تم تفعيل الطالب بنجاح'
          : 'تم تعطيل الطالب بنجاح',

        messageEn: student.isActive
          ? 'Student activated successfully'
          : 'Student deactivated successfully',

        data: student
      })
    );

    return true;
  }


  return false;
}

module.exports = studentsRoutes;