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

function schoolClassesRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host}`
  );

  const pathname = url.pathname;

  // =========================================
  // Only handle SchoolClasses endpoints
  // =========================================

  if (!pathname.startsWith('/api/SchoolClasses')) {
    return false;
  }


  // =========================================
  // GET /api/SchoolClasses/active
  // =========================================

  if (
    req.method === 'GET' &&
    pathname === '/api/SchoolClasses/active'
  ) {

    const activeClasses = schoolClasses
      .filter(item => item.isActive)
      .map(item => ({
        schoolClassId: item.schoolClassId,
        classNameAr: item.classNameAr,
        classNameEn: item.classNameEn
      }));

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الصفوف الفعالة بنجاح',
      messageEn: 'Active school classes retrieved successfully',
      data: activeClasses
    });

    return true;
  }


  // =========================================
  // GET /api/SchoolClasses/{id}
  // =========================================

  const idMatch = pathname.match(
    /^\/api\/SchoolClasses\/(\d+)$/
  );

  if (
    req.method === 'GET' &&
    idMatch
  ) {

    const schoolClassId = Number(idMatch[1]);

    const schoolClass = schoolClasses.find(
      item => item.schoolClassId === schoolClassId
    );

    if (!schoolClass) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الصف غير موجود',
        messageEn: 'School class not found',
        data: null
      });

      return true;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الصف بنجاح',
      messageEn: 'School class retrieved successfully',
      data: schoolClass
    });

    return true;
  }


  // =========================================
  // GET /api/SchoolClasses
  // =========================================

  if (
    req.method === 'GET' &&
    pathname === '/api/SchoolClasses'
  ) {

    const pageNumber = Math.max(
      Number(url.searchParams.get('pageNumber')) || 1,
      1
    );

    const pageSize = Math.max(
      Number(url.searchParams.get('pageSize')) || 10,
      1
    );

    const totalCount = schoolClasses.length;

    const totalPages = Math.ceil(
      totalCount / pageSize
    );

    const startIndex =
      (pageNumber - 1) * pageSize;

    const items = schoolClasses.slice(
      startIndex,
      startIndex + pageSize
    );

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الصفوف بنجاح',
      messageEn: 'School classes retrieved successfully',
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


  // =========================================
  // POST /api/SchoolClasses
  // =========================================

  if (
    req.method === 'POST' &&
    pathname === '/api/SchoolClasses'
  ) {

    getRequestBody(req)
      .then(body => {

        const {
          classNameAr,
          classNameEn,
          level,
          isGraduationGrade
        } = body;

        // Required fields
        if (
          !classNameAr ||
          !classNameEn ||
          level === undefined ||
          isGraduationGrade === undefined
        ) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'جميع الحقول المطلوبة يجب إدخالها',
            messageEn: 'All required fields must be provided',
            data: null
          });

          return;
        }


        // Duplicate level
        const duplicateLevel = schoolClasses.some(
          item => item.level === Number(level)
        );

        if (duplicateLevel) {

          sendJson(res, 409, {
            success: false,
            messageAr: 'يوجد صف بنفس المستوى',
            messageEn: 'A school class with the same level already exists',
            data: null
          });

          return;
        }


        const newId =
          schoolClasses.length > 0
            ? Math.max(
                ...schoolClasses.map(
                  item => item.schoolClassId
                )
              ) + 1
            : 1;

        const newSchoolClass = {
          schoolClassId: newId,
          classNameAr,
          classNameEn,
          level: Number(level),
          isGraduationGrade: Boolean(isGraduationGrade),
          isActive: true
        };

        schoolClasses.push(newSchoolClass);

        sendJson(res, 201, {
          success: true,
          messageAr: 'تم إنشاء الصف بنجاح',
          messageEn: 'School class created successfully',
          data: newSchoolClass
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


  // =========================================
  // PUT /api/SchoolClasses/{id}
  // =========================================

  if (
    req.method === 'PUT' &&
    idMatch
  ) {

    const schoolClassId = Number(idMatch[1]);

    getRequestBody(req)
      .then(body => {

        const schoolClass = schoolClasses.find(
          item => item.schoolClassId === schoolClassId
        );

        if (!schoolClass) {

          sendJson(res, 404, {
            success: false,
            messageAr: 'الصف غير موجود',
            messageEn: 'School class not found',
            data: null
          });

          return;
        }


        const {
          classNameAr,
          classNameEn,
          level,
          isGraduationGrade
        } = body;


        if (
          !classNameAr ||
          !classNameEn ||
          level === undefined ||
          isGraduationGrade === undefined
        ) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'جميع الحقول المطلوبة يجب إدخالها',
            messageEn: 'All required fields must be provided',
            data: null
          });

          return;
        }


        const duplicateLevel = schoolClasses.some(
          item =>
            item.schoolClassId !== schoolClassId &&
            item.level === Number(level)
        );

        if (duplicateLevel) {

          sendJson(res, 409, {
            success: false,
            messageAr: 'يوجد صف آخر بنفس المستوى',
            messageEn: 'Another school class with the same level already exists',
            data: null
          });

          return;
        }


        schoolClass.classNameAr = classNameAr;
        schoolClass.classNameEn = classNameEn;
        schoolClass.level = Number(level);
        schoolClass.isGraduationGrade =
          Boolean(isGraduationGrade);


        sendJson(res, 200, {
          success: true,
          messageAr: 'تم تحديث الصف بنجاح',
          messageEn: 'School class updated successfully',
          data: schoolClass
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


  // =========================================
  // PATCH /api/SchoolClasses/{id}/status
  // =========================================

  const statusMatch = pathname.match(
    /^\/api\/SchoolClasses\/(\d+)\/status$/
  );

  if (
    req.method === 'PATCH' &&
    statusMatch
  ) {

    const schoolClassId = Number(
      statusMatch[1]
    );

    const schoolClass = schoolClasses.find(
      item => item.schoolClassId === schoolClassId
    );

    if (!schoolClass) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الصف غير موجود',
        messageEn: 'School class not found',
        data: null
      });

      return true;
    }


    const isActiveValue =
      url.searchParams.get('isActive');

    if (
      isActiveValue !== 'true' &&
      isActiveValue !== 'false'
    ) {

      sendJson(res, 400, {
        success: false,
        messageAr: 'قيمة حالة الصف غير صالحة',
        messageEn: 'Invalid active status value',
        data: null
      });

      return true;
    }


    schoolClass.isActive =
      isActiveValue === 'true';


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم تحديث حالة الصف بنجاح',
      messageEn: 'School class status updated successfully',
      data: schoolClass
    });

    return true;
  }


  // =========================================
  // Unknown SchoolClasses endpoint
  // =========================================

  sendJson(res, 404, {
    success: false,
    messageAr: 'نقطة النهاية غير موجودة',
    messageEn: 'School class endpoint not found',
    data: null
  });

  return true;
}

module.exports = schoolClassesRoutes;