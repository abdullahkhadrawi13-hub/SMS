const users = require('../data/users');
const students = require('../data/students');
const teachers = require('../data/teachers');
const { parents } = require('../data/parents');


// =====================================================
// Settings
// =====================================================

// The real request takes about a second (password hashing is slow on purpose).
// 1000 shows the loading state on the button; 0 = no delay.
const DELAY_MS = 1000;

// 5 wrong admin passwords -> 429 for 5 minutes.
const MAX_WRONG_PASSWORDS = 5;
const LOCK_MINUTES = 5;

const ADMIN_ROLE = 0;


// =====================================================
// RULES (SMS API Reference - section 3)
// =====================================================
//
// POST /api/users/{userId}/reset-password
//   Body: { "adminPassword": "...", "temporaryPassword": "..." }
//
// 1. Admin only. No token: 401. Any other role: 403.
// 2. temporaryPassword must be 8 to 100 characters: 400 (validation).
// 3. adminPassword missing: 400 "Admin password is required.".
//    Wrong: 400 "Admin password is incorrect." (never 401), nothing changes.
//    5 wrong: 429 "Too many failed login attempts. Try again in 5 minutes.".
// 4. Unknown user: 404.
// 5. Success: 200 with data: null. The user's mustChangePassword becomes
//    true, and their old token stops working (they must log in again).
//
// =====================================================
// ASSUMPTIONS
// These rules are not taken from the real backend.
// =====================================================
//
// 1. The real backend shares the wrong-password counter between the login,
//    the rollover and this endpoint. The mock keeps its own counter here
//    (per Admin), reset when the mock restarts.
// 2. Only the users of data/users.js can log in to the mock, so only they
//    get the new password and a new token. For the other students,
//    teachers and parents, mustChangePassword is updated on their record.
// 3. Order of the checks: the body first (temporary password length, like
//    the real API's validation), then the Admin password, then the user.
//
// =====================================================


// { adminUserId: { wrong: 2, lockedUntil: 0 } } — in memory only.
const wrongAttempts = new Map();


function sendJson(res, statusCode, body) {

  setTimeout(() => {
    res.writeHead(statusCode);
    res.end(JSON.stringify(body));
  }, DELAY_MS);
}

function sendError(res, statusCode, messageAr, messageEn, data = null) {
  sendJson(res, statusCode, {
    success: false,
    messageAr,
    messageEn,
    data
  });
}

function getCurrentUser(req) {

  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : '';

  return users.find(user => user.token === token) || null;
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


// Every record that belongs to this account
// (the login user, and the student / teacher / parent row).
function findAccountRecords(userId) {

  return [
    ...users,
    ...students,
    ...teachers,
    ...parents
  ].filter(record => record.userId === userId);
}


// =====================================================
// POST /api/users/{userId}/reset-password
// =====================================================

async function resetPassword(req, res, userId) {

  const currentUser = getCurrentUser(req);

  if (!currentUser || !currentUser.isActive) {
    sendError(res, 401, 'يجب تسجيل الدخول.', 'You must log in.');
    return;
  }

  if (currentUser.role !== ADMIN_ROLE) {
    sendError(res, 403, 'ليس لديك صلاحية.', 'You do not have permission.');
    return;
  }

  let body;

  try {
    body = await readBody(req);
  } catch {
    sendError(res, 400, 'الطلب غير صالح.', 'Invalid request body.');
    return;
  }

  // ----- The temporary password -----

  const temporaryPassword = String(body.temporaryPassword ?? '').trim();

  if (temporaryPassword.length < 8 || temporaryPassword.length > 100) {
    sendError(
      res, 400,
      'فشل التحقق: يجب أن تكون كلمة المرور المؤقتة من 8 إلى 100 حرف.',
      'Validation failed: Temporary password must be between 8 and 100 characters.',
      ['Temporary password must be between 8 and 100 characters.']
    );
    return;
  }

  // ----- The Admin's password -----

  const attempts =
    wrongAttempts.get(currentUser.userId) ?? { wrong: 0, lockedUntil: 0 };

  if (attempts.lockedUntil > Date.now()) {
    sendError(
      res, 429,
      'محاولات تسجيل دخول فاشلة كثيرة. حاول مرة أخرى بعد 5 دقائق.',
      'Too many failed login attempts. Try again in 5 minutes.'
    );
    return;
  }

  // The lock is over: count again from zero.
  if (attempts.lockedUntil) {
    attempts.wrong = 0;
    attempts.lockedUntil = 0;
  }

  const adminPassword = String(body.adminPassword ?? '');

  if (!adminPassword) {
    sendError(res, 400, 'كلمة مرور المسؤول مطلوبة.', 'Admin password is required.');
    return;
  }

  if (adminPassword !== currentUser.password) {

    attempts.wrong += 1;

    if (attempts.wrong >= MAX_WRONG_PASSWORDS) {
      attempts.lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
      wrongAttempts.set(currentUser.userId, attempts);

      sendError(
        res, 429,
        'محاولات تسجيل دخول فاشلة كثيرة. حاول مرة أخرى بعد 5 دقائق.',
        'Too many failed login attempts. Try again in 5 minutes.'
      );
      return;
    }

    wrongAttempts.set(currentUser.userId, attempts);

    sendError(res, 400, 'كلمة مرور المسؤول غير صحيحة.', 'Admin password is incorrect.');
    return;
  }

  wrongAttempts.delete(currentUser.userId);

  // ----- The user -----

  const records = findAccountRecords(userId);

  if (records.length === 0) {
    sendError(res, 404, 'المستخدم غير موجود.', 'User not found.');
    return;
  }

  for (const record of records) {

    record.mustChangePassword = true;

    // Only the login users have a password and a token in the mock.
    if (users.includes(record)) {
      record.password = temporaryPassword;

      // A new token: the old one stops working, like the real API.
      record.token = `mock-${record.loginId}-token-${Date.now()}`;
    }
  }

  sendJson(res, 200, {
    success: true,
    messageAr: 'تمت إعادة تعيين كلمة المرور.',
    messageEn: 'The password was reset.',
    data: null
  });
}


// =====================================================
// Router
// =====================================================

function usersRoutes(req, res) {

  const pathname = req.url.split('?')[0].toLowerCase();

  const match = pathname.match(/^\/api\/users\/(\d+)\/reset-password$/);

  if (req.method === 'POST' && match) {
    resetPassword(req, res, Number(match[1]));
    return true;
  }

  return false;
}

module.exports = usersRoutes;
