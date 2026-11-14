import { StudentStatus } from '../../../core/models/student';

import {
  DashboardData,
  DashboardMapClass,
  DashboardMapSection,
  DashboardSectionRef,
  ParentDashboardData,
  SectionAttendanceState,
  StudentDashboardData,
  TeacherDashboardData,
} from './dashboard.models';


// ===================================================================
// TEMPORARY: sample data for the role dashboards.
//
// The backend endpoints for the dashboards are not ready yet, so the
// dashboards show these numbers, with a "sample data" note on the page.
//
// When the endpoints are ready:
//   1. a dashboard service builds the same shapes from the API,
//   2. the dashboards read them from the service instead,
//   3. this file and the SAMPLE_NOTE on the pages are deleted.
//
// Admin and AssistantPrincipal: DASHBOARD_SAMPLE_DATA.
// Teacher: TEACHER_DASHBOARD_SAMPLE_DATA (+ today's attendance from
//          DASHBOARD_SAMPLE_DATA when the teacher is the attendance officer).
// Student: STUDENT_DASHBOARD_SAMPLE_DATA.  Parent: PARENT_DASHBOARD_SAMPLE_DATA.
// The current term card of every dashboard: DASHBOARD_SAMPLE_DATA.term.
//
// The numbers agree with each other (the map, the totals and the
// "needs your attention" list come from the same sections below).
// ===================================================================


// [nameAr, nameEn, students, state, recorded, absent]
type SampleSection = [string, string, number, SectionAttendanceState, number, number];

// [nameAr, nameEn, sections]
type SampleClass = [string, string, SampleSection[]];

const SAMPLE_CLASSES: SampleClass[] = [
  ['الأول', 'Grade 1', [
    ['أ', 'A', 22, 'complete', 22, 1],
    ['ب', 'B', 21, 'complete', 21, 0],
  ]],
  ['الثاني', 'Grade 2', [
    ['أ', 'A', 23, 'complete', 23, 2],
    ['ب', 'B', 22, 'complete', 22, 1],
  ]],
  ['الثالث', 'Grade 3', [
    ['أ', 'A', 22, 'complete', 22, 0],
    ['ب', 'B', 21, 'complete', 21, 1],
  ]],
  ['الرابع', 'Grade 4', [
    ['أ', 'A', 24, 'complete', 24, 3],
    ['ب', 'B', 23, 'complete', 23, 1],
  ]],
  ['الخامس', 'Grade 5', [
    ['أ', 'A', 22, 'complete', 22, 0],
    ['ب', 'B', 22, 'complete', 22, 2],
  ]],
  ['السادس', 'Grade 6', [
    ['أ', 'A', 23, 'complete', 23, 1],
    ['ب', 'B', 22, 'complete', 22, 1],
  ]],
  ['السابع', 'Grade 7', [
    ['أ', 'A', 21, 'complete', 21, 2],
    ['ب', 'B', 20, 'notStarted', 0, 0],
    ['ج', 'C', 20, 'complete', 20, 1],
  ]],
  ['الثامن', 'Grade 8', [
    ['أ', 'A', 20, 'complete', 20, 2],
    ['ب', 'B', 19, 'complete', 19, 2],
    ['ج', 'C', 19, 'partial', 15, 1],
  ]],
  ['التاسع', 'Grade 9', [
    ['أ', 'A', 21, 'complete', 21, 1],
    ['ب', 'B', 20, 'complete', 20, 1],
    ['ج', 'C', 20, 'notStarted', 0, 0],
  ]],
  ['العاشر', 'Grade 10', [
    ['أ', 'A', 20, 'notStarted', 0, 0],
    ['ب', 'B', 20, 'notStarted', 0, 0],
    ['ج', 'C', 21, 'notStarted', 0, 0],
  ]],
];


// The sample classes in the shape of the models (ids are made up).
const classes: DashboardMapClass[] = SAMPLE_CLASSES.map(([nameAr, nameEn, sections], classIndex) => ({
  classId: classIndex + 1,
  nameAr,
  nameEn,
  sections: sections.map(([secAr, secEn, studentCount, state, recordedCount, absentCount], sectionIndex) => ({
    sectionId: (classIndex + 1) * 10 + sectionIndex + 1,
    nameAr: secAr,
    nameEn: secEn,
    state,
    studentCount,
    recordedCount,
    absentCount,
  })),
}));

const allSections: DashboardMapSection[] = classes.flatMap(c => c.sections);

const sum = (sections: DashboardMapSection[], pick: (s: DashboardMapSection) => number): number =>
  sections.reduce((total, section) => total + pick(section), 0);

const countState = (state: SectionAttendanceState): number =>
  allSections.filter(s => s.state === state).length;

// The sections of one state, named with their class ("الثامن ج").
const sectionsIn = (state: SectionAttendanceState) =>
  classes.flatMap(c =>
    c.sections
      .filter(s => s.state === state)
      .map(s => ({
        ref: {
          classNameAr: c.nameAr,
          classNameEn: c.nameEn,
          sectionNameAr: s.nameAr,
          sectionNameEn: s.nameEn,
        } satisfies DashboardSectionRef,
        section: s,
      }))
  );

const recordedCount = sum(allSections, s => s.recordedCount);
const absentCount = sum(allSections, s => s.absentCount);


export const DASHBOARD_SAMPLE_DATA: DashboardData = {

  today: {
    updatedAt: '2026-11-14T06:42:00',   // 9:42 in Amman
    sectionsTotal: allSections.length,
    sectionsComplete: countState('complete'),
    sectionsPartial: countState('partial'),
    sectionsNotStarted: countState('notStarted'),
    recordedCount,
    presentCount: recordedCount - absentCount,
    absentCount,
    classes,
  },

  stats: {
    activeStudents: sum(allSections, s => s.studentCount),
    activeSections: allSections.length,
    activeTeachers: 41,
    linkedParents: 386,
    activeClasses: classes.length,
    firstClass: { nameAr: classes[0].nameAr, nameEn: classes[0].nameEn },
    lastClass: { nameAr: classes[classes.length - 1].nameAr, nameEn: classes[classes.length - 1].nameEn },
  },

  attention: {
    notStartedSections: sectionsIn('notStarted').map(x => x.ref),
    partialSections: sectionsIn('partial').map(x => ({
      ...x.ref,
      recordedCount: x.section.recordedCount,
      studentCount: x.section.studentCount,
    })),
    incompletePlansCount: 2,
    attendanceOfficer: { nameAr: 'ليلى عمر حداد', nameEn: 'Layla Omar Haddad' },
  },

  term: {
    nameAr: 'الفصل الأول',
    nameEn: 'First Semester',
    yearName: '2026/2027',
    startDate: '2026-09-01',
    endDate: '2027-01-14',
    areGradesClosed: false,
  },
};


// ===================================================================
// Teacher: Mathematics in five sections of Grade 8 and Grade 9.
// Grade 8 C has an incomplete plan (no marks yet).
// ===================================================================

export const TEACHER_DASHBOARD_SAMPLE_DATA: TeacherDashboardData = {
  classCount: 2,
  rows: [
    { teacherAssignmentId: 1, classNameAr: 'الثامن', classNameEn: 'Grade 8', sectionNameAr: 'أ', sectionNameEn: 'A',
      subjectNameAr: 'الرياضيات', subjectNameEn: 'Mathematics',
      isPlanComplete: true, studentCount: 20, completeCount: 20, assessmentCount: 4 },
    { teacherAssignmentId: 2, classNameAr: 'الثامن', classNameEn: 'Grade 8', sectionNameAr: 'ب', sectionNameEn: 'B',
      subjectNameAr: 'الرياضيات', subjectNameEn: 'Mathematics',
      isPlanComplete: true, studentCount: 19, completeCount: 14, assessmentCount: 4 },
    { teacherAssignmentId: 3, classNameAr: 'الثامن', classNameEn: 'Grade 8', sectionNameAr: 'ج', sectionNameEn: 'C',
      subjectNameAr: 'الرياضيات', subjectNameEn: 'Mathematics',
      isPlanComplete: false, studentCount: 19, completeCount: 0, assessmentCount: 3 },
    { teacherAssignmentId: 4, classNameAr: 'التاسع', classNameEn: 'Grade 9', sectionNameAr: 'أ', sectionNameEn: 'A',
      subjectNameAr: 'الرياضيات', subjectNameEn: 'Mathematics',
      isPlanComplete: true, studentCount: 21, completeCount: 21, assessmentCount: 4 },
    { teacherAssignmentId: 5, classNameAr: 'التاسع', classNameEn: 'Grade 9', sectionNameAr: 'ب', sectionNameEn: 'B',
      subjectNameAr: 'الرياضيات', subjectNameEn: 'Mathematics',
      isPlanComplete: true, studentCount: 20, completeCount: 9, assessmentCount: 4 },
  ],
};


// ===================================================================
// Student: Grade 8 B, eight subjects (5 passed, 1 failed, 2 incomplete).
// ===================================================================

export const STUDENT_DASHBOARD_SAMPLE_DATA: StudentDashboardData = {
  info: {
    studentNumber: '2026000154',
    classNameAr: 'الثامن',
    classNameEn: 'Grade 8',
    sectionNameAr: 'ب',
    sectionNameEn: 'B',
    studentStatus: StudentStatus.Active,
  },
  subjects: [
    { subjectId: 1, nameAr: 'اللغة العربية', nameEn: 'Arabic', enteredCount: 4, assessmentCount: 4, total: 88, passingMark: 50, result: 'passed' },
    { subjectId: 2, nameAr: 'اللغة الإنجليزية', nameEn: 'English', enteredCount: 4, assessmentCount: 4, total: 79, passingMark: 50, result: 'passed' },
    { subjectId: 3, nameAr: 'الرياضيات', nameEn: 'Mathematics', enteredCount: 3, assessmentCount: 4, total: null, passingMark: 50, result: 'incomplete' },
    { subjectId: 4, nameAr: 'العلوم', nameEn: 'Science', enteredCount: 4, assessmentCount: 4, total: 47, passingMark: 50, result: 'failed' },
    { subjectId: 5, nameAr: 'التربية الإسلامية', nameEn: 'Islamic Education', enteredCount: 3, assessmentCount: 3, total: 92, passingMark: 50, result: 'passed' },
    { subjectId: 6, nameAr: 'الدراسات الاجتماعية', nameEn: 'Social Studies', enteredCount: 2, assessmentCount: 3, total: null, passingMark: 50, result: 'incomplete' },
    { subjectId: 7, nameAr: 'الحاسوب', nameEn: 'Computer', enteredCount: 3, assessmentCount: 3, total: 95, passingMark: 50, result: 'passed' },
    { subjectId: 8, nameAr: 'التربية الفنية', nameEn: 'Art', enteredCount: 2, assessmentCount: 2, total: 90, passingMark: 50, result: 'passed' },
  ],
  absentDays: 3,
  lastAbsentDate: '2026-11-10',
};


// ===================================================================
// Parent: two children. Karim (the same student as above) is absent
// today and fails Science; Sara has nothing to worry about.
// ===================================================================

export const PARENT_DASHBOARD_SAMPLE_DATA: ParentDashboardData = {
  children: [
    {
      studentId: 154,
      studentNumber: '2026000154',
      firstNameAr: 'كريم', fatherNameAr: 'سامي', grandFatherNameAr: 'يوسف', familyNameAr: 'الخطيب',
      firstNameEn: 'Karim', fatherNameEn: 'Sami', grandFatherNameEn: 'Yousef', familyNameEn: 'Al-Khatib',
      classNameAr: 'الثامن', classNameEn: 'Grade 8', sectionNameAr: 'ب', sectionNameEn: 'B',
      subjectCount: 8, passedCount: 5, failedCount: 1, incompleteCount: 2,
      failedSubjects: [{ nameAr: 'العلوم', nameEn: 'Science', total: 47, passingMark: 50 }],
      absentDays: 3,
      isAbsentToday: true,
    },
    {
      studentId: 71,
      studentNumber: '2026000071',
      firstNameAr: 'سارة', fatherNameAr: 'سامي', grandFatherNameAr: 'يوسف', familyNameAr: 'الخطيب',
      firstNameEn: 'Sara', fatherNameEn: 'Sami', grandFatherNameEn: 'Yousef', familyNameEn: 'Al-Khatib',
      classNameAr: 'الرابع', classNameEn: 'Grade 4', sectionNameAr: 'أ', sectionNameEn: 'A',
      subjectCount: 7, passedCount: 6, failedCount: 0, incompleteCount: 1,
      failedSubjects: [],
      absentDays: 0,
      isAbsentToday: false,
    },
  ],
};
