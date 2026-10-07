const academicTerms = require('../data/academic-terms');


// =========================
// Academic Terms API
// =========================

module.exports = (req, res) => {

  // =========================
  // GET /api/academicterms
  // =========================

  if (
    req.method === 'GET' &&
    req.url === '/api/academicterms'
  ) {

    res.writeHead(200);

    res.end(
      JSON.stringify({
        success: true,
        messageAr: 'تم جلب الفصول الأكاديمية بنجاح',
        messageEn: 'Academic terms retrieved successfully',
        data: academicTerms
      })
    );

    return true;
  }


  // ============================================
  // GET /api/academicterms/by-year/{academicYearId}
  // ============================================

  if (
    req.method === 'GET' &&
    req.url.startsWith('/api/academicterms/by-year/')
  ) {

    // Get the academic year ID from the URL
    const academicYearId = Number(
      req.url.split('/').pop()
    );


    // Find all terms that belong to the requested year
    const terms = academicTerms
      .filter(
        term => term.academicYearId === academicYearId
      )
      .sort(
        (a, b) => a.termNumber - b.termNumber
      );


    res.writeHead(200);

    res.end(
      JSON.stringify({
        success: true,
        messageAr: 'تم جلب الفصول الأكاديمية بنجاح',
        messageEn: 'Academic terms retrieved successfully',
        data: terms
      })
    );

    return true;
  }


  // This route does not handle the request
  return false;
};