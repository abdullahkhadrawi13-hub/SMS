// =====================================================
// Student Grades (kept in memory only)
// =====================================================
//
// One mark of one student in one assessment (API Reference, section 10).
// Every change made through the mock API (saving the grade sheet) is lost
// when the mock server is restarted.
//
// The list starts empty. Some marks are added by the route the first time
// a grade sheet is read (routes/student-grades.routes.js, SEED), because the
// fixed assessments (first exam, final exam) are created there from the plan
// and their ids are not known before.
//
// Shape of one stored mark:
// {
//   studentGradeId: 1,
//   studentId: 8,
//   assessmentId: 3,
//   mark: 9,
//   recordedByUserId: 3,
//   recordedAt: '2026-10-15T08:30:00',
//   editedByUserId: null,
//   editedAt: null,
//
//   // The mark's history (GET /api/studentgrades/{id}/history), newest first.
//   // [] = never changed. Each save that changes the mark adds one row.
//   changes: [{ oldMark: 7, newMark: 9, changedByUserId: 1, changedAt: '2026-10-18T09:40:00' }]
// }

const studentGrades = [];

module.exports = studentGrades;