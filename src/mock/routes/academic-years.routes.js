const academicYears = require('../data/academic-years');


// =========================
// Helpers
// =========================

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

// "2025-09-01" -> "2025-09-01T00:00:00" (same shape as the real API).
function toApiDateTime(value) {
  return `${String(value).substring(0, 10)}T00:00:00`;
}

// Checks the body of POST / PUT. Returns an error response or null.
function validateYear(body, editedId) {

  const { yearName, startDate, endDate } = body;

  if (!yearName || !startDate || !endDate) {
    return {
      messageAr: 'جميع الحقول المطلوبة يجب إدخالها',
      messageEn: 'All required fields must be provided'
    };
  }

  if (!/^\d{4}\/\d{4}$/.test(String(yearName).trim())) {
    return {
      messageAr: 'اسم السنة يجب أن يكون بصيغة 2025/2026',
      messageEn: 'Year name must look like 2025/2026'
    };
  }

  if (toApiDateTime(startDate) >= toApiDateTime(endDate)) {
    return {
      messageAr: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
      messageEn: 'Start date must be before end date'
    };
  }

  // YearName is unique (SMS Final Specification, section 20).
  const duplicate = academicYears.some(
    year =>
      year.academicYearId !== editedId &&
      year.yearName === String(yearName).trim()
  );

  if (duplicate) {
    return {
      messageAr: 'توجد سنة دراسية بنفس الاسم',
      messageEn: 'An academic year with the same name already exists'
    };
  }

  return null;
}


// =========================
// Academic Years API
// =========================

module.exports = (req, res) => {

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // /api/academicyears/{id}
  const idMatch = pathname.match(/^\/api\/academicyears\/(\d+)$/);


  // =========================
  // GET /api/academicyears
  // =========================

  if (req.method === 'GET' && pathname === '/api/academicyears') {

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب السنوات الأكاديمية بنجاح',
      messageEn: 'Academic years retrieved successfully',
      data: academicYears
    });

    return true;
  }


  // =========================
  // GET /api/academicyears/{id}
  // =========================

  if (req.method === 'GET' && idMatch) {

    const year = academicYears.find(
      item => item.academicYearId === Number(idMatch[1])
    );

    if (!year) {
      sendJson(res, 404, {
        success: false,
        messageAr: 'السنة الدراسية غير موجودة',
        messageEn: 'Academic year not found.',
        data: null
      });

      return true;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب السنة الدراسية بنجاح',
      messageEn: 'Academic year retrieved successfully',
      data: year
    });

    return true;
  }


  // =========================
  // POST /api/academicyears
  // =========================

  if (req.method === 'POST' && pathname === '/api/academicyears') {

    getRequestBody(req)
      .then(body => {

        const error = validateYear(body, null);

        if (error) {
          sendJson(res, 400, { success: false, ...error, data: null });
          return;
        }

        const newId =
          academicYears.length > 0
            ? Math.max(...academicYears.map(item => item.academicYearId)) + 1
            : 1;

        // A new year is never current (it becomes current with its term).
        const newYear = {
          academicYearId: newId,
          yearName: String(body.yearName).trim(),
          startDate: toApiDateTime(body.startDate),
          endDate: toApiDateTime(body.endDate),
          isCurrent: false
        };

        academicYears.push(newYear);

        sendJson(res, 201, {
          success: true,
          messageAr: 'تم إنشاء السنة الدراسية بنجاح',
          messageEn: 'Academic year created successfully',
          data: newYear
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


  // =========================
  // PUT /api/academicyears/{id}
  // =========================

  if (req.method === 'PUT' && idMatch) {

    getRequestBody(req)
      .then(body => {

        const year = academicYears.find(
          item => item.academicYearId === Number(idMatch[1])
        );

        if (!year) {
          sendJson(res, 404, {
            success: false,
            messageAr: 'السنة الدراسية غير موجودة',
            messageEn: 'Academic year not found.',
            data: null
          });
          return;
        }

        const error = validateYear(body, year.academicYearId);

        if (error) {
          sendJson(res, 400, { success: false, ...error, data: null });
          return;
        }

        year.yearName = String(body.yearName).trim();
        year.startDate = toApiDateTime(body.startDate);
        year.endDate = toApiDateTime(body.endDate);

        // PUT returns data: null (API Reference, section 7).
        sendJson(res, 200, {
          success: true,
          messageAr: 'تم تعديل السنة الدراسية بنجاح',
          messageEn: 'Academic year updated successfully',
          data: null
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


  // This route does not handle the request
  return false;
};
