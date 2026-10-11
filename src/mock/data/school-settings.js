// =====================================================
// School Settings (kept in memory only)
// =====================================================
//
// One settings row for the whole school (singleton),
// like SchoolSettings in the real backend.
//
// Every change made through the mock API is lost when
// the mock server is restarted.
//
// Shape:
// {
//   attendanceOfficerTeacherId: 20   // teacherId, or null when no officer is set
// }

const teachers = require('./teachers');

// When the mock starts, the attendance officer is the teacher
// who logs in as "officer" (see data/teachers.js and data/users.js).
// Use null instead to start with a school that has no attendance officer:
//   attendanceOfficerTeacherId: null
const officer = teachers.find(
  teacher => teacher.loginId === 'officer'
);

const schoolSettings = {
  attendanceOfficerTeacherId: officer ? officer.teacherId : null
};

module.exports = schoolSettings;
