const sections = require('../data/sections');


function sectionsRoutes(req, res) {

  // =====================================================
  // GET /api/Sections
  // Get sections with pagination and filters
  // =====================================================

  if (
    req.method === 'GET' &&
    req.url.startsWith('/api/Sections')
  ) {

    const url = new URL(
      req.url,
      'http://localhost:5253'
    );


    // ---------------------------------------------------
    // Query Parameters
    // ---------------------------------------------------

    const pageNumber =
      Number(
        url.searchParams.get('pageNumber')
      ) || 1;

    const pageSize =
      Number(
        url.searchParams.get('pageSize')
      ) || 10;

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


    // ---------------------------------------------------
    // Filtering
    // ---------------------------------------------------

    let filteredSections =
      [...sections];


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


    // ---------------------------------------------------
    // Pagination
    // ---------------------------------------------------

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


    // ---------------------------------------------------
    // Response
    // ---------------------------------------------------

    res.writeHead(200);

    res.end(
      JSON.stringify({

        success: true,

        messageAr:
          'تم جلب الصفوف بنجاح',

        messageEn:
          'Sections retrieved successfully',

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
  // Endpoint not handled
  // =====================================================

  return false;
}


module.exports = sectionsRoutes;