// Grades (API Reference, section 7):
// areGradesClosed        = the term's grades are closed (read-only everywhere).
// gradesClosedAt         = when they were closed (UTC without "Z"), null while open.
// gradesClosedByRollover = closed by the year-end rollover: can never be opened.
//
// Things to try:
// - Terms 1-4 (the two earlier years) were closed by the rollover:
//   no "Open grades" for them, and the term 4 grade sheet is read-only.
// - Terms 5 and 6 (2026/2027) are open: close term 5 from the academic
//   years page, then open the grade sheet of a current-term subject.

module.exports = [
  // =========================
  // Academic Year: 2024/2025
  // =========================

  {
    academicTermId: 1,
    academicYearId: 1,
    termNumber: 1,
    nameAr: 'الفصل الدراسي الأول',
    nameEn: 'First Term',
    startDate: '2024-09-01T00:00:00',
    endDate: '2025-01-16T00:00:00',
    isActive: false,
    isCurrent: false,
    areGradesClosed: true,
    gradesClosedAt: '2025-09-01T06:00:00',
    gradesClosedByRollover: true
  },

  {
    academicTermId: 2,
    academicYearId: 1,
    termNumber: 2,
    nameAr: 'الفصل الدراسي الثاني',
    nameEn: 'Second Term',
    startDate: '2025-02-02T00:00:00',
    endDate: '2025-06-30T00:00:00',
    isActive: false,
    isCurrent: false,
    areGradesClosed: true,
    gradesClosedAt: '2025-09-01T06:00:00',
    gradesClosedByRollover: true
  },


  // =========================
  // Academic Year: 2025/2026
  // =========================

  {
    academicTermId: 3,
    academicYearId: 2,
    termNumber: 1,
    nameAr: 'الفصل الدراسي الأول',
    nameEn: 'First Term',
    startDate: '2025-09-01T00:00:00',
    endDate: '2026-01-15T00:00:00',
    isActive: true,
    isCurrent: false,
    areGradesClosed: true,
    gradesClosedAt: '2026-09-01T06:00:00',
    gradesClosedByRollover: true
  },

  {
    academicTermId: 4,
    academicYearId: 2,
    termNumber: 2,
    nameAr: 'الفصل الدراسي الثاني',
    nameEn: 'Second Term',
    startDate: '2026-02-01T00:00:00',
    endDate: '2026-06-30T00:00:00',
    isActive: true,
    isCurrent: false,
    areGradesClosed: true,
    gradesClosedAt: '2026-09-01T06:00:00',
    gradesClosedByRollover: true
  },


  // =========================
  // Academic Year: 2026/2027
  // =========================

  {
    academicTermId: 5,
    academicYearId: 3,
    termNumber: 1,
    nameAr: 'الفصل الدراسي الأول',
    nameEn: 'First Term',
    startDate: '2026-10-11T00:00:00',
    endDate: '2027-01-14T00:00:00',
    isActive: true,
    isCurrent: true,
    areGradesClosed: false,
    gradesClosedAt: null,
    gradesClosedByRollover: false
  },

  {
    academicTermId: 6,
    academicYearId: 3,
    termNumber: 2,
    nameAr: 'الفصل الدراسي الثاني',
    nameEn: 'Second Term',
    startDate: '2027-02-01T00:00:00',
    endDate: '2027-06-30T00:00:00',
    isActive: true,
    isCurrent: false,
    areGradesClosed: false,
    gradesClosedAt: null,
    gradesClosedByRollover: false
  }
];