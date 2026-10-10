// =====================================================
// Attendance records (kept in memory only)
// =====================================================
//
// The list starts empty and is cleared every time
// the mock server is restarted.
//
// Shape of one record:
// {
//   attendanceId: 1,
//   studentId: 2,
//   academicTermId: 3,
//   date: '2026-10-09',   // YYYY-MM-DD
//   status: 0,            // 0 = Present, 1 = Absent
//   recordedByUserId: 1,
//   recordedAt: '2026-10-09T07:15:20.123',  // UTC, without "Z"
//   editedByUserId: null,
//   editedAt: null
// }

const attendanceRecords = [];

module.exports = attendanceRecords;