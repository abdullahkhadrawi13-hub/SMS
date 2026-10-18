// =====================================================
// Subject Plans (kept in memory only)
// =====================================================
//
// One plan per (academic term, class, subject) — API Reference, section 9.
// The administration sets the components, their weights and the passing mark
// once, and every section of the class follows the plan.
//
// Every change made through the mock API (add, edit, lock, copy, delete)
// is lost when the mock server is restarted.
//
// Only the ids are kept here. The route adds the names (term, class,
// subject) and the computed fields (totalWeight, isComplete,
// assignmentCount) when it sends a plan, like SubjectPlanDto in the API.
//
// The mock has no assessments or grades. Instead:
//   - plan.hasGrades says "a mark exists in one of the sections"
//   - component.hasMarks says "this component has marks"
//     (so it cannot be deleted, and a fixed one keeps its max mark)
//
// Shape of one stored plan:
// {
//   subjectPlanId: 1,
//   academicTermId: 3,
//   classId: 1,
//   subjectId: 1,
//   passingMark: 50,
//   isLocked: true,
//   hasGrades: true,
//   components: [
//     { subjectPlanComponentId: 1, nameAr: 'كويزات', nameEn: 'Quizzes',
//       weight: 20, teacherAddsAssessments: true, maxMark: null, order: 1,
//       hasMarks: true }
//   ]
// }


// Term 5 is the current term (First Term 2026/2027, data/academic-terms.js),
// term 4 is the one before it (Second Term 2025/2026).
// Term 6 (the next term) has no plans: try "Copy from an earlier term" into it.
const CURRENT_TERM = 5;
const PREVIOUS_TERM = 4;


// Components: [ nameAr, nameEn, weight, teacherAddsAssessments, maxMark ]
const TEMPLATES = {

  // Quizzes 20 (open) + First exam 20 (out of 20) + Final exam 60 (out of 60)
  standard: [
    ['كويزات', 'Quizzes', 20, true, null],
    ['الامتحان الأول', 'First exam', 20, false, 20],
    ['الامتحان النهائي', 'Final exam', 60, false, 60]
  ],

  // Two open components + two exams
  math: [
    ['كويزات', 'Quizzes', 10, true, null],
    ['واجبات', 'Homework', 10, true, null],
    ['الامتحان الأول', 'First exam', 30, false, 30],
    ['الامتحان النهائي', 'Final exam', 50, false, 50]
  ],

  // Only 80 of 100: teachers cannot enter marks yet
  incomplete: [
    ['كويزات', 'Quizzes', 20, true, null],
    ['الامتحان النهائي', 'Final exam', 60, false, 60]
  ],

  // Recitation (open) + final
  recitation: [
    ['تسميع', 'Recitation', 40, true, null],
    ['الامتحان النهائي', 'Final exam', 60, false, 60]
  ]
};


// One row per plan:
// [ academicTermId, classId, subjectId, passingMark, isLocked, hasGrades, template ]
//
// Things to try (current term, Class 1):
// - Arabic: locked, with marks (unlock it, then try deleting a component).
// - Science: 80 of 100 (incomplete).
// - Computer: a plan with no teacher in Section A ("no teacher" line).
// - Physical Education: no plan at all (dashed card + "Create plan").
// - Vocational Education is inactive, so it never shows.
const rows = [

  // ===== Current term: Class 1 =====
  [CURRENT_TERM, 1, 1, 50, true, true, 'standard'],     // Arabic
  [CURRENT_TERM, 1, 2, 50, false, false, 'standard'],   // English
  [CURRENT_TERM, 1, 3, 50, false, false, 'math'],       // Mathematics
  [CURRENT_TERM, 1, 4, 50, false, false, 'incomplete'], // Science
  [CURRENT_TERM, 1, 5, 50, false, false, 'recitation'], // Islamic Education
  [CURRENT_TERM, 1, 6, 50, false, false, 'standard'],   // Social Studies
  [CURRENT_TERM, 1, 7, 60, false, false, 'standard'],   // Art
  [CURRENT_TERM, 1, 8, 50, false, false, 'standard'],   // Computer (no teacher yet)

  // ===== Current term: Class 2 =====
  [CURRENT_TERM, 2, 1, 50, false, false, 'standard'],
  [CURRENT_TERM, 2, 2, 50, true, true, 'standard'],
  [CURRENT_TERM, 2, 3, 50, false, false, 'math'],
  [CURRENT_TERM, 2, 4, 50, false, false, 'standard'],
  [CURRENT_TERM, 2, 5, 50, false, false, 'recitation'],

  // ===== Current term: Class 3 =====
  [CURRENT_TERM, 3, 1, 50, false, false, 'standard'],
  [CURRENT_TERM, 3, 2, 50, false, false, 'standard'],
  [CURRENT_TERM, 3, 3, 55, false, false, 'math'],
  [CURRENT_TERM, 3, 8, 50, false, false, 'standard'],
  [CURRENT_TERM, 3, 9, 50, false, false, 'standard'],

  // ===== Previous term: Class 1 =====
  [PREVIOUS_TERM, 1, 1, 50, true, true, 'standard'],
  [PREVIOUS_TERM, 1, 3, 50, true, true, 'math'],
  [PREVIOUS_TERM, 1, 4, 50, true, true, 'standard']
];


let nextComponentId = 1;

const subjectPlans = rows.map((row, index) => {

  const [termId, classId, subjectId, passingMark, isLocked, hasGrades, template] = row;

  return {
    subjectPlanId: index + 1,
    academicTermId: termId,
    classId,
    subjectId,
    passingMark,
    isLocked,
    hasGrades,
    components: TEMPLATES[template].map((c, i) => ({
      subjectPlanComponentId: nextComponentId++,
      nameAr: c[0],
      nameEn: c[1],
      weight: c[2],
      teacherAddsAssessments: c[3],
      maxMark: c[4],
      order: i + 1,
      // A plan with marks: its first two components have marks.
      hasMarks: hasGrades && i < 2
    }))
  };
});


module.exports = subjectPlans;
