// =====================================================
// Attendance records (kept in memory only)
// =====================================================
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
//
// Every change made through the mock API is lost when the mock server
// is restarted.
//
// Sample history (to try «حضوري», «حضور أبنائي» and the "Attendance" tab
// of the student page). Every school day (Sunday to Thursday) from the
// start of the term up to YESTERDAY, so today's sheet still starts empty:
//   - student 2 (the "student" account, and a child of the "parent"
//     account): the current term with a few absences, a day nobody
//     recorded and an edited day, plus the whole of the earlier term 4.
//   - student 8 (the parent's other child): the current term, all present.
//   - student 7 (graduated, shown to the parent): term 4 only.
// SEED_HISTORY = false starts with no records at all, as before.

const SEED_HISTORY = true;

const academicTerms = require('./academic-terms');

const attendanceRecords = [];

if (SEED_HISTORY) {
  seedHistory();
}

module.exports = attendanceRecords;


function seedHistory() {

  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  const current = academicTerms.find(term => term.isCurrent);
  const term4 = academicTerms.find(term => term.academicTermId === 4);

  // The numbers are positions among the term's school days (1 = the first).
  if (current) {
    addTerm(2, current, yesterday, { absent: [6, 15, 24], unrecorded: [11, -3], edited: [9] });
    addTerm(8, current, yesterday, {});
  }

  if (term4) {
    addTerm(2, term4, yesterday, { absent: [10, 33, 57, 80], unrecorded: [20] });
    addTerm(7, term4, yesterday, { absent: [44] });
  }

  attendanceRecords.sort((a, b) =>
    a.date.localeCompare(b.date) || a.studentId - b.studentId
  );

  attendanceRecords.forEach((record, index) => {
    record.attendanceId = index + 1;
  });
}

// One student, one term. Negative positions count from the end
// (-3 = the third school day before the last one).
function addTerm(studentId, term, lastDay, { absent = [], unrecorded = [], edited = [] }) {

  const days = schoolDays(term, lastDay);
  const at = position => days[position > 0 ? position - 1 : days.length + position];

  const absentDays = absent.map(at).filter(Boolean);
  const unrecordedDays = unrecorded.map(at).filter(Boolean);
  const editedDays = edited.map(at).filter(Boolean);

  for (const date of days) {

    if (unrecordedDays.includes(date)) {
      continue;
    }

    // 08:05 to 08:07 in Amman = 05:05 to 05:07 UTC
    const minute = 5 + (Number(date.slice(-2)) % 3);

    attendanceRecords.push({
      attendanceId: 0,
      studentId,
      academicTermId: term.academicTermId,
      date,
      status: absentDays.includes(date) ? 1 : 0,
      recordedByUserId: 1,
      recordedAt: `${date}T05:0${minute}:12.000`,
      editedByUserId: editedDays.includes(date) ? 1 : null,
      editedAt: editedDays.includes(date) ? `${date}T09:41:00.000` : null
    });
  }
}

// The term's school days (Sunday to Thursday), up to lastDay.
function schoolDays(term, lastDay) {

  const days = [];

  const day = toDate(term.startDate);
  const end = toDate(term.endDate);

  while (day <= end && day <= lastDay) {

    if (day.getDay() !== 5 && day.getDay() !== 6) {
      days.push(toApiDate(day));
    }

    day.setDate(day.getDate() + 1);
  }

  return days;
}

function toDate(value) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toApiDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
