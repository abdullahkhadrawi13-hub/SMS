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
//   attendanceOfficerTeacherId: 20,  // teacherId, or null when no officer is set
//   failedSubjectsToRepeat: 1        // the rollover setting (1 to 50, default 1)
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
  attendanceOfficerTeacherId: officer ? officer.teacherId : null,

  // How many failed subjects (or more) make the rollover preview
  // suggest "Repeat" (GET / PUT /api/schoolsettings/promotion).
  // The rollover mock reads it on every preview.
  failedSubjectsToRepeat: 1
};

module.exports = schoolSettings;
