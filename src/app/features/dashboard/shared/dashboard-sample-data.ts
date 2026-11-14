import {
  DashboardData,
  DashboardMapClass,
  DashboardMapSection,
  DashboardSectionRef,
  SectionAttendanceState,
} from './dashboard.models';


// ===================================================================
// TEMPORARY: sample data for the Admin and AssistantPrincipal dashboards.
//
// The backend endpoints for the dashboard are not ready yet, so the
// dashboards show these numbers, with a "sample data" note on the page.
//
// When the endpoints are ready:
//   1. a dashboard service builds DashboardData from the API,
//   2. the two dashboards read it from the service instead,
//   3. this file and the SAMPLE_NOTE on both pages are deleted.
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
