const http = require('http');

const authRoutes = require('./routes/auth.routes');
const studentsRoutes = require('./routes/students.routes');
const sectionsRoutes = require('./routes/sections.routes');
const schoolClassesRoutes = require('./routes/school-classes.routes');

const PORT = 5253;

const server = http.createServer((req, res) => {

  // =========================
  // Common Headers
  // =========================

  res.setHeader(
    'Content-Type',
    'application/json'
  );

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );


  // =========================
  // CORS Preflight
  // =========================

  if (req.method === 'OPTIONS') {

    res.writeHead(204);

    res.end();

    return;
  }


  // =========================
  // Auth API
  // =========================

  if (authRoutes(req, res)) {
    return;
  }


  // =========================
  // Students API
  // =========================

  if (studentsRoutes(req, res)) {
    return;
  }


  // =========================
  // Sections API
  // =========================

  if (sectionsRoutes(req, res)) {
    return;
  }



    // =========================
  // School Classes API
  // =========================

  if (schoolClassesRoutes(req, res)) {
    return;
  }


  


  // =========================
  // Endpoint Not Found
  // =========================

  res.writeHead(404);

  res.end(
    JSON.stringify({
      success: false,
      message: 'Endpoint not found',
      data: null
    })
  );

});


server.listen(PORT, () => {

  console.log(
    `Mock API running on http://localhost:${PORT}`
  );

});