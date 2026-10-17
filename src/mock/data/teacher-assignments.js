// =====================================================
// Teacher Assignments (kept in memory only)
// =====================================================
//
// An assignment = a subject taught in one section of a class,
// in one academic term, by one teacher (API Reference, section 8).
// In the Subjects page each assignment is "a subject of the section".
//
// Every change made through the mock API (add, edit,
// activate / deactivate) is lost when the mock server
// is restarted.
//
// Only the ids are kept here. The route adds the names
// (term, class, section, subject, teacher number, teacher name
// and teacher status) and the subjectPlanId (the plan with the same
// term, class and subject, data/subject-plans.js) when it
// sends an assignment, like TeacherAssignmentDto in the API.
//
// The passing mark and the lock are not on the assignment any more:
// they live on the subject plan (API Reference, section 9, 2026-10-16).
//
// Shape of one stored assignment:
// {
//   teacherAssignmentId: 1,
//   teacherId: 19,
//   academicTermId: 3,
//   classId: 1,
//   sectionId: 1,
//   subjectId: 1,
//   isActive: true
// }

const teachers = require('./teachers');


// teacherId of a teacher who can log in (see data/teachers.js and data/users.js),
// so you can log in as "teacher" or "teacher2" and see "My subjects".
function loginTeacherId(loginId) {
  const teacher = teachers.find(t => t.loginId === loginId);
  return teacher ? teacher.teacherId : 1;
}

const TEACHER = loginTeacherId('teacher');     // 19
const TEACHER2 = loginTeacherId('teacher2');   // 21

// Term 3 is the current term (data/academic-terms.js), term 2 is the one before it.
const CURRENT_TERM = 3;
const PREVIOUS_TERM = 2;


// One row per assignment:
// [ teacherId, academicTermId, classId, sectionId, subjectId, isActive ]
// Every (term, class, subject) here has a plan in data/subject-plans.js.
//
// Things to try:
// - Class 1 / Section A: one inactive subject (Art), and Social Studies
//   with teacher 4 whose account is inactive (warning in the table and the edit dialog).
// - Class 1 / Section C: no subjects (empty state + "Add the first subject").
// - Class 3: different subjects from class 1 (Computer, Physical Education).
// - Log in as "teacher": My subjects (Arabic in 3 sections + Islamic Education).
// - Term 2 (previous term): a few old assignments.
const rows = [

  // ===== Current term: Class 1 / Section A (sectionId 1) =====
  [TEACHER, CURRENT_TERM, 1, 1, 1, true], // Arabic
  [2, CURRENT_TERM, 1, 1, 2, true],       // English
  [5, CURRENT_TERM, 1, 1, 3, true],       // Mathematics
  [3, CURRENT_TERM, 1, 1, 4, true],       // Science
  [TEACHER, CURRENT_TERM, 1, 1, 5, true], // Islamic Education
  [4, CURRENT_TERM, 1, 1, 6, true],       // Social Studies (teacher 4 is inactive)
  [16, CURRENT_TERM, 1, 1, 7, false],     // Art (inactive)

  // ===== Current term: Class 1 / Section B (sectionId 2) =====
  [TEACHER, CURRENT_TERM, 1, 2, 1, true],
  [2, CURRENT_TERM, 1, 2, 2, true],
  [5, CURRENT_TERM, 1, 2, 3, true],
  [3, CURRENT_TERM, 1, 2, 4, true],

  // Class 1 / Section C (sectionId 3): no subjects on purpose.

  // ===== Current term: Class 2 / Section A (sectionId 4) =====
  [TEACHER, CURRENT_TERM, 2, 4, 1, true],
  [10, CURRENT_TERM, 2, 4, 2, true],
  [11, CURRENT_TERM, 2, 4, 3, true],
  [12, CURRENT_TERM, 2, 4, 4, true],
  [TEACHER2, CURRENT_TERM, 2, 4, 5, true],

  // ===== Current term: Class 3 / Section A (sectionId 7) =====
  [9, CURRENT_TERM, 3, 7, 1, true],
  [10, CURRENT_TERM, 3, 7, 2, true],
  [11, CURRENT_TERM, 3, 7, 3, true],
  [14, CURRENT_TERM, 3, 7, 8, true],      // Computer
  [15, CURRENT_TERM, 3, 7, 9, true],      // Physical Education

  // ===== Previous term: Class 1 / Section A (sectionId 1) =====
  [1, PREVIOUS_TERM, 1, 1, 1, true],
  [5, PREVIOUS_TERM, 1, 1, 3, true],
  [3, PREVIOUS_TERM, 1, 1, 4, true]
];

const teacherAssignments = rows.map((row, index) => ({
  teacherAssignmentId: index + 1,
  teacherId: row[0],
  academicTermId: row[1],
  classId: row[2],
  sectionId: row[3],
  subjectId: row[4],
  isActive: row[5]
}));

module.exports = teacherAssignments;