const academicTerms = require('../data/academic-terms');
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

function notFound(res) {
  sendJson(res, 404, {
    success: false,
    messageAr: 'الفصل الدراسي غير موجود',
    messageEn: 'Academic term not found.',
    data: null
  });
}

function invalidBody(res) {
  sendJson(res, 400, {
    success: false,
    messageAr: 'بيانات الطلب غير صالحة',
    messageEn: 'Invalid request body',
    data: null
  });
}

// Checks the body of POST / PUT (SMS Final Specification, section 23).
// Returns an error response or null.
function validateTerm(body, academicYearId, editedId) {

  const { termNumber, nameAr, nameEn, startDate, endDate, isActive } = body;

  if (
    termNumber === undefined ||
    !nameAr ||
    !nameEn ||
    !startDate ||
    !endDate ||
    isActive === undefined
  ) {
    return {
      messageAr: 'جميع الحقول المطلوبة يجب إدخالها',
      messageEn: 'All required fields must be provided'
    };
  }

  if (!Number.isInteger(Number(termNumber)) || Number(termNumber) <= 0) {
    return {
      messageAr: 'رقم الفصل يجب أن يكون رقمًا صحيحًا أكبر من 0',
      messageEn: 'Term number must be a whole number greater than 0'
    };
  }

  const start = toApiDateTime(startDate);
  const end = toApiDateTime(endDate);

  // StartDate must be strictly less than EndDate.
  if (start >= end) {
    return {
      messageAr: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
      messageEn: 'Start date must be before end date'
    };
  }

  const yearTerms = academicTerms.filter(
    term =>
      term.academicYearId === academicYearId &&
      term.academicTermId !== editedId
  );

  // Unique: AcademicYearId + TermNumber.
  if (yearTerms.some(term => term.termNumber === Number(termNumber))) {
    return {
      messageAr: 'يوجد فصل بنفس الرقم في هذه السنة',
      messageEn: 'A term with the same number already exists in this year'
    };
  }

  // Terms of the same year must not overlap.
  const overlaps = yearTerms.some(
    term => start <= term.endDate && end >= term.startDate
  );

  if (overlaps) {
    return {
      messageAr: 'تتداخل مدة الفصل مع فصل آخر في نفس السنة',
      messageEn: 'The term dates overlap another term of the same year'
    };
  }

  return null;
}


// =========================
// Academic Terms API
// =========================

module.exports = (req, res) => {

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // /api/academicterms/{id}
  const idMatch = pathname.match(/^\/api\/academicterms\/(\d+)$/);

  // /api/academicterms/{id}/current
  const currentMatch = pathname.match(/^\/api\/academicterms\/(\d+)\/current$/);

  // /api/academicterms/by-year/{academicYearId}
  const byYearMatch = pathname.match(/^\/api\/academicterms\/by-year\/(\d+)$/);


  // =========================
  // GET /api/academicterms
  // =========================

  if (req.method === 'GET' && pathname === '/api/academicterms') {

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الفصول الأكاديمية بنجاح',
      messageEn: 'Academic terms retrieved successfully',
      data: academicTerms
    });

    return true;
  }


  // ============================================
  // GET /api/academicterms/by-year/{academicYearId}
  // ============================================

  if (req.method === 'GET' && byYearMatch) {

    const academicYearId = Number(byYearMatch[1]);

    // A year that does not exist returns 400 (API Reference, section 7).
    const yearExists = academicYears.some(
      year => year.academicYearId === academicYearId
    );

    if (!yearExists) {
      sendJson(res, 400, {
        success: false,
        messageAr: 'السنة الدراسية غير موجودة',
        messageEn: 'Academic year not found.',
        data: null
      });

      return true;
    }

    const terms = academicTerms
      .filter(term => term.academicYearId === academicYearId)
      .sort((a, b) => a.termNumber - b.termNumber);

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الفصول الأكاديمية بنجاح',
      messageEn: 'Academic terms retrieved successfully',
      data: terms
    });

    return true;
  }


  // =========================
  // GET /api/academicterms/{id}
  // =========================

  if (req.method === 'GET' && idMatch) {

    const term = academicTerms.find(
      item => item.academicTermId === Number(idMatch[1])
    );

    if (!term) {
      notFound(res);
      return true;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم جلب الفصل الدراسي بنجاح',
      messageEn: 'Academic term retrieved successfully',
      data: term
    });

    return true;
  }


  // =========================
  // POST /api/academicterms
  // =========================

  if (req.method === 'POST' && pathname === '/api/academicterms') {

    getRequestBody(req)
      .then(body => {

        const academicYearId = Number(body.academicYearId);

        const yearExists = academicYears.some(
          year => year.academicYearId === academicYearId
        );

        if (!yearExists) {
          sendJson(res, 400, {
            success: false,
            messageAr: 'السنة الدراسية غير موجودة',
            messageEn: 'Academic year not found.',
            data: null
          });
          return;
        }

        const error = validateTerm(body, academicYearId, null);

        if (error) {
          sendJson(res, 400, { success: false, ...error, data: null });
          return;
        }

        const newId =
          academicTerms.length > 0
            ? Math.max(...academicTerms.map(item => item.academicTermId)) + 1
            : 1;

        // A new term is never current (PATCH .../current does that).
        const newTerm = {
          academicTermId: newId,
          academicYearId,
          termNumber: Number(body.termNumber),
          nameAr: String(body.nameAr).trim(),
          nameEn: String(body.nameEn).trim(),
          startDate: toApiDateTime(body.startDate),
          endDate: toApiDateTime(body.endDate),
          isActive: Boolean(body.isActive),
          isCurrent: false
        };

        academicTerms.push(newTerm);

        sendJson(res, 201, {
          success: true,
          messageAr: 'تم إنشاء الفصل الدراسي بنجاح',
          messageEn: 'Academic term created successfully',
          data: newTerm
        });
      })
      .catch(() => invalidBody(res));

    return true;
  }


  // =========================
  // PUT /api/academicterms/{id}
  // =========================

  if (req.method === 'PUT' && idMatch) {

    getRequestBody(req)
      .then(body => {

        const term = academicTerms.find(
          item => item.academicTermId === Number(idMatch[1])
        );

        if (!term) {
          notFound(res);
          return;
        }

        // academicYearId never changes (it is create only).
        const error = validateTerm(body, term.academicYearId, term.academicTermId);

        if (error) {
          sendJson(res, 400, { success: false, ...error, data: null });
          return;
        }

        // The current term cannot be deactivated.
        if (term.isCurrent && body.isActive === false) {
          sendJson(res, 400, {
            success: false,
            messageAr: 'لا يمكن تعطيل الفصل الحالي',
            messageEn: 'The current term cannot be deactivated',
            data: null
          });
          return;
        }

        term.termNumber = Number(body.termNumber);
        term.nameAr = String(body.nameAr).trim();
        term.nameEn = String(body.nameEn).trim();
        term.startDate = toApiDateTime(body.startDate);
        term.endDate = toApiDateTime(body.endDate);
        term.isActive = Boolean(body.isActive);

        // PUT returns data: null (API Reference, section 7).
        sendJson(res, 200, {
          success: true,
          messageAr: 'تم تعديل الفصل الدراسي بنجاح',
          messageEn: 'Academic term updated successfully',
          data: null
        });
      })
      .catch(() => invalidBody(res));

    return true;
  }


  // =========================================
  // PATCH /api/academicterms/{id}/current
  // =========================================

  if (req.method === 'PATCH' && currentMatch) {

    const term = academicTerms.find(
      item => item.academicTermId === Number(currentMatch[1])
    );

    if (!term) {
      notFound(res);
      return true;
    }

    if (!term.isActive) {
      sendJson(res, 400, {
        success: false,
        messageAr: 'لا يمكن تعيين فصل معطل كفصل حالي',
        messageEn: 'An inactive term cannot be set as the current term',
        data: null
      });

      return true;
    }

    // Like the real API: the old term and year stop being current first,
    // then the new term and its year become current.
    academicTerms.forEach(item => { item.isCurrent = false; });
    academicYears.forEach(year => { year.isCurrent = false; });

    term.isCurrent = true;

    const year = academicYears.find(
      item => item.academicYearId === term.academicYearId
    );

    if (year) {
      year.isCurrent = true;
    }

    sendJson(res, 200, {
      success: true,
      messageAr: 'تم تعيين الفصل الحالي بنجاح',
      messageEn: 'Current term set successfully',
      data: null
    });

    return true;
  }


  // This route does not handle the request
  return false;
};
