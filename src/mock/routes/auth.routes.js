const users = require('../data/users');

// =========================
// Auth API (mock)
// =========================
// POST /api/Auth/Login
// POST /api/Auth/changePassword
//
// Same behaviour as the real backend (SMS API Reference, section 3):
// - wrong login ID, wrong password or inactive account -> 401 with one message for all three
// - 5 wrong passwords for the same loginId -> 429 for 5 minutes
//   (the real API also counts per device; the mock counts per loginId only)
// - a successful login clears the counter
// - changePassword: 8 to 100 characters, different from the current one,
//   equal to confirmPassword; returns the user with a new token and
//   mustChangePassword = false

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

// { "sara.k": { failed: 3, lockedUntil: 0 } } — in memory, reset when the mock restarts
const loginAttempts = {};


function sendJson(res, status, body) {

  res.writeHead(status);

  res.end(JSON.stringify(body));
}

function readBody(req) {

  return new Promise((resolve, reject) => {

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

// The user is found by the token sent in the Authorization header.
function getCurrentUser(req) {

  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : '';

  return users.find(user => user.token === token) || null;
}

// The user as the real API returns it (no password), plus the token.
function toLoginResponse(user) {

  return {
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
  };
}

function invalidBody(res) {

  sendJson(res, 400, {
    success: false,
    messageAr: 'بيانات الطلب غير صالحة',
    messageEn: 'Invalid request body',
    data: null
  });
}


// =========================
// Login
// =========================

function wrongCredentials(res) {

  sendJson(res, 401, {
    success: false,
    messageAr: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    messageEn: 'Invalid login ID or password.',
    data: null
  });
}

function tooManyAttempts(res) {

  sendJson(res, 429, {
    success: false,
    messageAr: 'محاولات تسجيل دخول فاشلة كثيرة. حاول مرة أخرى بعد 5 دقائق.',
    messageEn: 'Too many failed login attempts. Try again in 5 minutes.',
    data: null
  });
}

async function login(req, res) {

  let body;

  try {
    body = await readBody(req);
  } catch {
    invalidBody(res);
    return;
  }

  // The real API trims spaces from the login ID
  const loginId = String(body.loginId ?? '').trim();
  const password = String(body.password ?? '');

  const key = loginId.toLowerCase();
  const attempts = loginAttempts[key] || { failed: 0, lockedUntil: 0 };

  // Still locked: refused even with the right password
  if (attempts.lockedUntil > Date.now()) {
    tooManyAttempts(res);
    return;
  }

  // The lock is over: start counting again
  if (attempts.lockedUntil) {
    attempts.failed = 0;
    attempts.lockedUntil = 0;
  }

  const user = users.find(u => u.loginId === loginId);

  // Wrong login ID, wrong password or inactive account: the same answer
  if (!user || user.password !== password || !user.isActive) {

    attempts.failed += 1;

    if (attempts.failed >= MAX_FAILED_ATTEMPTS) {
      attempts.lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
      loginAttempts[key] = attempts;
      tooManyAttempts(res);
      return;
    }

    loginAttempts[key] = attempts;
    wrongCredentials(res);
    return;
  }

  delete loginAttempts[key];

  sendJson(res, 200, {
    success: true,
    messageAr: 'تم تسجيل الدخول بنجاح.',
    messageEn: 'Login successful.',
    data: toLoginResponse(user)
  });
}


// =========================
// Change password
// =========================

function validationError(res, messageAr, messageEn) {

  sendJson(res, 400, {
    success: false,
    messageAr,
    messageEn,
    data: null
  });
}

async function changePassword(req, res) {

  const user = getCurrentUser(req);

  if (!user || !user.isActive) {

    sendJson(res, 401, {
      success: false,
      messageAr: 'انتهت الجلسة. سجّل الدخول مرة أخرى.',
      messageEn: 'Your session has ended. Please sign in again.',
      data: null
    });

    return;
  }

  let body;

  try {
    body = await readBody(req);
  } catch {
    invalidBody(res);
    return;
  }

  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');
  const confirmPassword = String(body.confirmPassword ?? '');

  if (currentPassword !== user.password) {
    validationError(
      res,
      'كلمة المرور الحالية غير صحيحة.',
      'The current password is incorrect.'
    );
    return;
  }

  if (newPassword.length < 8 || newPassword.length > 100) {
    validationError(
      res,
      'يجب أن تكون كلمة المرور الجديدة من 8 إلى 100 حرف.',
      'The new password must be between 8 and 100 characters.'
    );
    return;
  }

  if (newPassword === currentPassword) {
    validationError(
      res,
      'يجب أن تختلف كلمة المرور الجديدة عن الحالية.',
      'The new password must be different from the current one.'
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    validationError(
      res,
      'كلمة المرور الجديدة وتأكيدها غير متطابقين.',
      'The new password and its confirmation do not match.'
    );
    return;
  }

  user.password = newPassword;
  user.mustChangePassword = false;

  // A new token: the old one stops working, like the real API
  user.token = `mock-${user.loginId}-token-${Date.now()}`;

  sendJson(res, 200, {
    success: true,
    messageAr: 'تم تغيير كلمة المرور بنجاح.',
    messageEn: 'Password changed successfully.',
    data: toLoginResponse(user)
  });
}


// =========================
// Router
// =========================

function authRoutes(req, res) {

  const url = req.url.split('?')[0].toLowerCase();

  if (req.method === 'POST' && url === '/api/auth/login') {
    login(req, res);
    return true;
  }

  if (req.method === 'POST' && url === '/api/auth/changepassword') {
    changePassword(req, res);
    return true;
  }

  return false;
}

module.exports = authRoutes;
