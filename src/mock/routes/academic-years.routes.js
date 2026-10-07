const academicYears = require('../data/academic-years');


// =========================
// Academic Years API
// =========================

module.exports = (req, res) => {

  // GET /api/academicyears
  if (
    req.method === 'GET' &&
    req.url === '/api/academicyears'
  ) {

    res.writeHead(200);

    res.end(
      JSON.stringify({
        success: true,
        messageAr: 'تم جلب السنوات الأكاديمية بنجاح',
        messageEn: 'Academic years retrieved successfully',
        data: academicYears
      })
    );

    return true;
  }


  // This route does not handle the request
  return false;
};