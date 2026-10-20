// =====================================================
// Assessments (kept in memory only)
// =====================================================
//
// Every assessment belongs to one teacher assignment (a subject in one
// section) and to one component of the subject plan (API Reference, section 9).
//
// Two kinds:
//   - fixed (isFixed: true): one per fixed component of the plan, in every
//     section. The route creates them when a section's assessments are read,
//     and keeps their name and max mark the same as the plan component
//     (so a component the Admin adds or edits shows here too).
//   - teacher-added (isFixed: false): quizzes the teacher adds under an
//     open component. Only these are stored here at start.
//
// Every change made through the mock API (add, edit, delete) is lost when
// the mock server is restarted.
//
// The mock has no grades. hasMarks stands for "this assessment has marks":
// it cannot be deleted, and its max mark cannot change.
// A fixed assessment takes hasMarks from its plan component
// (component.hasMarks in data/subject-plans.js).
//
// Shape of one stored assessment:
// {
//   assessmentId: 1,
//   teacherAssignmentId: 1,
//   subjectPlanComponentId: 1,
//   isFixed: false,
//   nameAr: 'كويز 1',
//   nameEn: 'Quiz 1',
//   maxMark: 10,
//   order: 1,
//   hasMarks: true
// }

const teacherAssignments = require('./teacher-assignments');
const subjectPlans = require('./subject-plans');
const teachers = require('./teachers');


// The teacher who logs in as "teacher" (data/users.js).
const TEACHER = (teachers.find(t => t.loginId === 'teacher') || {}).teacherId;

// Term 5 is the current term (First Term 2026/2027, data/academic-terms.js),
// the same term as data/teacher-assignments.js and data/subject-plans.js.
const CURRENT_TERM = 5;


// The open component of the plan a section follows (the first one, or the
// one at the given position among the open components).
function openComponentOf(assignment, position = 0) {

  const plan = subjectPlans.find(p =>
    p.academicTermId === assignment.academicTermId &&
    p.classId === assignment.classId &&
    p.subjectId === assignment.subjectId
  );

  if (!plan) {
    return null;
  }

  const open = [...plan.components]
    .sort((a, b) => a.order - b.order)
    .filter(c => c.teacherAddsAssessments);

  return open[position] || null;
}


// The teacher's assignment for (class, section, subject) in the current term.
function teacherAssignment(classId, sectionId, subjectId) {

  return teacherAssignments.find(a =>
    a.teacherId === TEACHER &&
    a.academicTermId === CURRENT_TERM &&
    a.classId === classId &&
    a.sectionId === sectionId &&
    a.subjectId === subjectId
  );
}


// Quizzes added by the teacher at start:
// [ classId, sectionId, subjectId, nameAr, nameEn, maxMark, hasMarks ]
//
// Things to try (log in as "teacher", then My classes):
// - Class 1 / Section A / Arabic: Quiz 1 and Quiz 2 have marks
//   (delete or a new max mark → 400), Quiz 3 has none (can be deleted).
//   The plan is locked: the header shows "Locked".
// - Class 1 / Section B / Arabic: one quiz, no marks.
// - Class 1 / Section A / Islamic Education: "Recitation" with one assessment.
// - Class 2 / Section A / Arabic: no quizzes yet (empty open component).
const rows = [
  [1, 1, 1, 'كويز 1', 'Quiz 1', 10, true],
  [1, 1, 1, 'كويز 2', 'Quiz 2', 5, true],
  [1, 1, 1, 'كويز 3', 'Quiz 3', 10, false],

  [1, 2, 1, 'كويز 1', 'Quiz 1', 10, false],

  [1, 1, 5, 'تسميع سورة الفاتحة', 'Recitation: Al-Fatiha', 10, false]
];


const assessments = [];

for (const row of rows) {

  const [classId, sectionId, subjectId, nameAr, nameEn, maxMark, hasMarks] = row;

  const assignment = teacherAssignment(classId, sectionId, subjectId);
  const component = assignment ? openComponentOf(assignment) : null;

  if (!assignment || !component) {
    continue;
  }

  const order = assessments.filter(a =>
    a.teacherAssignmentId === assignment.teacherAssignmentId &&
    a.subjectPlanComponentId === component.subjectPlanComponentId
  ).length + 1;

  assessments.push({
    assessmentId: assessments.length + 1,
    teacherAssignmentId: assignment.teacherAssignmentId,
    subjectPlanComponentId: component.subjectPlanComponentId,
    isFixed: false,
    nameAr,
    nameEn,
    maxMark,
    order,
    hasMarks
  });
}


module.exports = assessments;
