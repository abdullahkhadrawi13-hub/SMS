// =====================================================
// Student and parent home pages (API Reference, section 15)
// =====================================================
//
// The mock has almost no marks at start, so the home page cards take their
// newest marks from here. The current-term attendance comes from the
// records in data/attendance.js when the student has some in the current
// term (students 2 and 8 do); the attendance here is used otherwise.
// The student's name, class, section and status come from data/students.js,
// and the current term from data/academic-terms.js (routes/dashboard.routes.js).
//
// By studentId. A student that is not here gets no attendance yet
// (zeros) and no marks.
//
// lastAbsenceDate 'TODAY' = today's date (to try "غياب اليوم").
// savedAt is UTC without "Z", like the real API.

module.exports = {

  // The "student" account (userId 4) is student 2; the "parent" account
  // (parent 1) has students 2 and 8.
  2: {
    attendance: { presentCount: 40, absentCount: 3, lastAbsenceDate: 'TODAY' },
    latestMarks: [
      { subjectId: 3, assessmentNameAr: 'كويز 3', assessmentNameEn: 'Quiz 3', mark: 8, maxMark: 10, savedAt: '2026-11-19T09:10:00', isEdited: false },
      { subjectId: 1, assessmentNameAr: 'الامتحان الأول', assessmentNameEn: 'First exam', mark: 17.5, maxMark: 20, savedAt: '2026-11-18T11:40:00', isEdited: true },
      { subjectId: 4, assessmentNameAr: 'كويز 2', assessmentNameEn: 'Quiz 2', mark: 4, maxMark: 10, savedAt: '2026-11-17T08:05:00', isEdited: false },
      { subjectId: 2, assessmentNameAr: 'كويز 2', assessmentNameEn: 'Quiz 2', mark: 9, maxMark: 10, savedAt: '2026-11-16T10:20:00', isEdited: false },
      { subjectId: 5, assessmentNameAr: 'الامتحان الأول', assessmentNameEn: 'First exam', mark: 19, maxMark: 20, savedAt: '2026-11-15T12:00:00', isEdited: false }
    ]
  },

  8: {
    attendance: { presentCount: 43, absentCount: 0, lastAbsenceDate: null },
    latestMarks: [
      { subjectId: 4, assessmentNameAr: 'كويز 1', assessmentNameEn: 'Quiz 1', mark: 10, maxMark: 10, savedAt: '2026-11-18T09:00:00', isEdited: false },
      { subjectId: 3, assessmentNameAr: 'الامتحان الأول', assessmentNameEn: 'First exam', mark: 18, maxMark: 20, savedAt: '2026-11-14T09:00:00', isEdited: false }
    ]
  }
};
