// =====================================================
// Subjects (kept in memory only)
// =====================================================
//
// Every change made through the mock API (add, edit,
// activate / deactivate) is lost when the mock server
// is restarted.
//
// Shape of one subject (API Reference, section 6):
// {
//   subjectId: 1,
//   subjectAr: 'اللغة العربية',
//   subjectEn: 'Arabic Language',
//   isActive: true
// }

// One row per subject: [ Arabic name, English name, isActive ]
const rows = [
  ['اللغة العربية', 'Arabic Language', true],
  ['اللغة الإنجليزية', 'English Language', true],
  ['الرياضيات', 'Mathematics', true],
  ['العلوم', 'Science', true],
  ['التربية الإسلامية', 'Islamic Education', true],
  ['الاجتماعيات', 'Social Studies', true],
  ['التربية الفنية', 'Art Education', true],
  ['الحاسوب', 'Computer', true],
  ['التربية الرياضية', 'Physical Education', true],
  ['التربية المهنية', 'Vocational Education', false]
];

const subjects = rows.map((row, index) => ({
  subjectId: index + 1,
  subjectAr: row[0],
  subjectEn: row[1],
  isActive: row[2]
}));

module.exports = subjects;
