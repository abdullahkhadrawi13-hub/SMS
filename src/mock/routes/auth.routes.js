const users = require('../data/users');

function authRoutes(req, res) {

  if (
    req.method === 'POST' &&
    req.url === '/api/Auth/Login'
  ) {

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {

      try {

        const loginData = JSON.parse(body);

        const user = users.find(
          u =>
            u.loginId === loginData.loginId &&
            u.password === loginData.password
        );

        if (!user) {

          res.writeHead(401);

          res.end(
            JSON.stringify({
              success: false,
              message: 'Invalid login credentials',
              data: null
            })
          );

          return;
        }

        if (!user.isActive) {

          res.writeHead(403);

          res.end(
            JSON.stringify({
              success: false,
              message: 'User is inactive',
              data: null
            })
          );

          return;
        }

        const response = {
          success: true,
          message: 'Login successful',

          data: {
            userId: user.userId,

            firstNameAr: user.firstNameAr,
            fatherNameAr: user.fatherNameAr,
            grandFatherNameAr: user.grandFatherNameAr,
            familyNameAr: user.familyNameAr,

            firstNameEn: user.firstNameEn,
            fatherNameEn: user.fatherNameEn,
            grandFatherNameEn: user.grandFatherNameEn,
            familyNameEn: user.familyNameEn,

            loginId: user.loginId,

            mustChangePassword: user.mustChangePassword,
            isActive: user.isActive,

            role: user.role,

            phoneNumber: user.phoneNumber,

            token: user.token
          }
        };

        res.writeHead(200);

        res.end(
          JSON.stringify(response)
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

  return false;
}

module.exports = authRoutes;