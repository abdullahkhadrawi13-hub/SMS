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


function getSectionSimpleDto(section) {
  return {
    sectionId: section.sectionId,
    classId: section.classId,
    sectionAr: section.sectionAr,
    sectionEn: section.sectionEn,
    isActive: section.isActive
  };
}


function getActiveSectionDto(section) {
  return {
    sectionId: section.sectionId,
    sectionAr: section.sectionAr,
    sectionEn: section.sectionEn
  };
}


function sectionsRoutes(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost:5253'}`
  );

  const pathname = url.pathname;


  // =====================================================
  // Only handle Sections API
  // =====================================================

  if (!pathname.startsWith('/api/Sections')) {
    return false;
  }


  // =====================================================
  // GET /api/Sections/by-class/{classId}
  // =====================================================

  const byClassMatch = pathname.match(
    /^\/api\/Sections\/by-class\/(\d+)$/
  );

  if (
    req.method === 'GET' &&
    byClassMatch
  ) {

    const classId = Number(byClassMatch[1]);

    const classExists = schoolClasses.some(
      schoolClass =>
        schoolClass.schoolClassId === classId
    );

    if (!classExists) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الصف غير موجود',
        messageEn: 'School class not found',
        data: null
      });

      return true;
    }


    const classSections = sections
      .filter(section => section.classId === classId)
      .map(getSectionSimpleDto);


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب شعب الصف بنجاح',
      messageEn: 'Class sections retrieved successfully',
      data: classSections
    });

    return true;
  }


  // =====================================================
  // GET /api/Sections/active-by-class/{classId}
  // =====================================================

  const activeByClassMatch = pathname.match(
    /^\/api\/Sections\/active-by-class\/(\d+)$/
  );

  if (
    req.method === 'GET' &&
    activeByClassMatch
  ) {

    const classId = Number(
      activeByClassMatch[1]
    );

    const classExists = schoolClasses.some(
      schoolClass =>
        schoolClass.schoolClassId === classId
    );

    if (!classExists) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الصف غير موجود',
        messageEn: 'School class not found',
        data: null
      });

      return true;
    }


    const activeSections = sections
      .filter(
        section =>
          section.classId === classId &&
          section.isActive === true
      )
      .map(getActiveSectionDto);


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الشعب الفعالة بنجاح',
      messageEn: 'Active class sections retrieved successfully',
      data: activeSections
    });

    return true;
  }


  // =====================================================
  // GET /api/Sections/{sectionId}
  // =====================================================

  const sectionIdMatch = pathname.match(
    /^\/api\/Sections\/(\d+)$/
  );

  if (
    req.method === 'GET' &&
    sectionIdMatch
  ) {

    const sectionId = Number(
      sectionIdMatch[1]
    );

    const section = sections.find(
      item => item.sectionId === sectionId
    );

    if (!section) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الشعبة غير موجودة',
        messageEn: 'Section not found',
        data: null
      });

      return true;
    }


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الشعبة بنجاح',
      messageEn: 'Section retrieved successfully',
      data: getSectionSimpleDto(section)
    });

    return true;
  }


  // =====================================================
  // GET /api/Sections
  // Get sections with filters + pagination
  // =====================================================

  if (
    req.method === 'GET' &&
    pathname === '/api/Sections'
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


    const academicYearId =
      url.searchParams.get('academicYearId');

    const academicTermId =
      url.searchParams.get('academicTermId');

    const classId =
      url.searchParams.get('classId');

    const sectionId =
      url.searchParams.get('sectionId');

    const isActive =
      url.searchParams.get('isActive');


    let filteredSections = [...sections];


    // Academic Year
    if (academicYearId !== null) {

      filteredSections =
        filteredSections.filter(
          section =>
            section.academicYearId ===
            Number(academicYearId)
        );
    }


    // Academic Term
    if (academicTermId !== null) {

      filteredSections =
        filteredSections.filter(
          section =>
            section.academicTermId ===
            Number(academicTermId)
        );
    }


    // Class
    if (classId !== null) {

      filteredSections =
        filteredSections.filter(
          section =>
            section.classId ===
            Number(classId)
        );
    }


    // Section
    if (sectionId !== null) {

      filteredSections =
        filteredSections.filter(
          section =>
            section.sectionId ===
            Number(sectionId)
        );
    }


    // Active / Inactive
    if (isActive !== null) {

      const active =
        isActive === 'true';

      filteredSections =
        filteredSections.filter(
          section =>
            section.isActive === active
        );
    }


    // Pagination
    const totalCount =
      filteredSections.length;

    const totalPages =
      Math.ceil(
        totalCount / pageSize
      );

    const startIndex =
      (pageNumber - 1) * pageSize;

    const items =
      filteredSections.slice(
        startIndex,
        startIndex + pageSize
      );


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الشعب بنجاح',
      messageEn: 'Sections retrieved successfully',
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
  // POST /api/Sections
  // =====================================================

  if (
    req.method === 'POST' &&
    pathname === '/api/Sections'
  ) {

    getRequestBody(req)
      .then(body => {

        const {
          classId,
          sectionAr,
          sectionEn
        } = body;


        // Required fields
        if (
          classId === undefined ||
          !sectionAr ||
          !sectionEn
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
          Number(classId);


        // Validate class
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


        // Duplicate section name
        const duplicate =
          sections.some(
            section =>
              section.classId === numericClassId &&
              (
                section.sectionAr === sectionAr ||
                section.sectionEn.toLowerCase() ===
                sectionEn.toLowerCase()
              )
          );

        if (duplicate) {

          sendJson(res, 409, {
            success: false,
            messageAr: 'الشعبة موجودة مسبقًا في هذا الصف',
            messageEn: 'Section already exists in this class',
            data: null
          });

          return;
        }


        const newId =
          sections.length > 0
            ? Math.max(
                ...sections.map(
                  item => item.sectionId
                )
              ) + 1
            : 1;


        const newSection = {

          sectionId: newId,

          classId: numericClassId,

          classNameAr:
            schoolClass.classNameAr,

          classNameEn:
            schoolClass.classNameEn,

          sectionAr,

          sectionEn,

          studentCount: 0,

          isActive: true,

          academicYearId: 1,

          academicTermId: 1
        };


        sections.push(newSection);


        sendJson(res, 201, {
          success: true,
          messageAr: 'تم إنشاء الشعبة بنجاح',
          messageEn: 'Section created successfully',
          data: getSectionSimpleDto(newSection)
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
  // PUT /api/Sections/{sectionId}
  // =====================================================

  if (
    req.method === 'PUT' &&
    sectionIdMatch
  ) {

    const sectionId =
      Number(sectionIdMatch[1]);


    getRequestBody(req)
      .then(body => {

        const section =
          sections.find(
            item =>
              item.sectionId === sectionId
          );


        if (!section) {

          sendJson(res, 404, {
            success: false,
            messageAr: 'الشعبة غير موجودة',
            messageEn: 'Section not found',
            data: null
          });

          return;
        }


        const {
          sectionAr,
          sectionEn
        } = body;


        if (
          !sectionAr ||
          !sectionEn
        ) {

          sendJson(res, 400, {
            success: false,
            messageAr: 'جميع الحقول المطلوبة يجب إدخالها',
            messageEn: 'All required fields must be provided',
            data: null
          });

          return;
        }


        const duplicate =
          sections.some(
            item =>
              item.sectionId !== sectionId &&
              item.classId === section.classId &&
              (
                item.sectionAr === sectionAr ||
                item.sectionEn.toLowerCase() ===
                sectionEn.toLowerCase()
              )
          );


        if (duplicate) {

          sendJson(res, 409, {
            success: false,
            messageAr: 'الشعبة موجودة مسبقًا في هذا الصف',
            messageEn: 'Section already exists in this class',
            data: null
          });

          return;
        }


        section.sectionAr = sectionAr;
        section.sectionEn = sectionEn;


        sendJson(res, 200, {
          success: true,
          messageAr: 'تم تحديث الشعبة بنجاح',
          messageEn: 'Section updated successfully',
          data: getSectionSimpleDto(section)
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
  // PATCH /api/Sections/{sectionId}/status
  // =====================================================

  const statusMatch = pathname.match(
    /^\/api\/Sections\/(\d+)\/status$/
  );


  if (
    req.method === 'PATCH' &&
    statusMatch
  ) {

    const sectionId =
      Number(statusMatch[1]);


    const section =
      sections.find(
        item =>
          item.sectionId === sectionId
      );


    if (!section) {

      sendJson(res, 404, {
        success: false,
        messageAr: 'الشعبة غير موجودة',
        messageEn: 'Section not found',
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
        messageAr: 'قيمة الحالة غير صالحة',
        messageEn: 'Invalid active status value',
        data: null
      });

      return true;
    }


    section.isActive =
      isActiveValue === 'true';


    sendJson(res, 200, {
      success: true,
      messageAr: 'تم تحديث حالة الشعبة بنجاح',
      messageEn: 'Section status updated successfully',
      data: getSectionSimpleDto(section)
    });

    return true;
  }


  // =====================================================
  // Unknown Sections endpoint
  // =====================================================

  sendJson(res, 404, {
    success: false,
    messageAr: 'نقطة النهاية غير موجودة',
    messageEn: 'Section endpoint not found',
    data: null
  });

  return true;
}


module.exports = sectionsRoutes;