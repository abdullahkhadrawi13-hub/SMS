// What the Admin and AssistantPrincipal dashboards show.
//
// These are the shapes the dashboard components read (view models),
// not API responses. For now dashboard-sample-data.ts fills them.
// When the backend endpoints are ready, a service will build the same
// shapes from the API, and the components stay as they are.


// A name in both languages (class, section, term, person).
export interface LocalizedName {
  nameAr: string;
  nameEn: string;
}


// ===== Today's attendance (card "حضور اليوم") =====

// How far a section got with today's attendance sheet.
//   complete    every student has a status
//   partial     some students have a status
//   notStarted  nobody has a status yet
export type SectionAttendanceState = 'complete' | 'partial' | 'notStarted';

// One square in the sections map.
export interface DashboardMapSection extends LocalizedName {
  sectionId: number;
  state: SectionAttendanceState;
  studentCount: number;   // students in the section
  recordedCount: number;  // students with a status today
  absentCount: number;    // students marked absent today
}

// One line in the sections map: a class and its sections.
export interface DashboardMapClass extends LocalizedName {
  classId: number;
  sections: DashboardMapSection[];
}

export interface TodayAttendance {
  // Last time the numbers were loaded (a UTC time from the API,
  // read with fromApiDateTime from shared/utils/date-time.ts).
  updatedAt: string;

  sectionsTotal: number;
  sectionsComplete: number;
  sectionsPartial: number;
  sectionsNotStarted: number;

  recordedCount: number;  // students with a status today
  presentCount: number;
  absentCount: number;

  classes: DashboardMapClass[];
}


// ===== The numbers strip (spec: الأرقام المجمّعة) =====

export interface DashboardStats {
  activeStudents: number;
  activeSections: number;
  activeTeachers: number;
  linkedParents: number;    // parents linked to at least one student
  activeClasses: number;

  // The first and last class by level ("الأول إلى العاشر").
  firstClass: LocalizedName | null;
  lastClass: LocalizedName | null;
}


// ===== Needs your attention (card "يحتاج انتباهك") =====

// A section named by its class: "الثامن ج" / "Grade 8 C".
export interface DashboardSectionRef {
  classNameAr: string;
  classNameEn: string;
  sectionNameAr: string;
  sectionNameEn: string;
}

export interface DashboardPartialSection extends DashboardSectionRef {
  recordedCount: number;
  studentCount: number;
}

export interface DashboardAttention {
  notStartedSections: DashboardSectionRef[];
  partialSections: DashboardPartialSection[];

  // Subject plans of the current term whose weights are under 100%
  // (isComplete = false), so teachers cannot enter marks yet.
  incompletePlansCount: number;

  // The person in SchoolSettings.AttendanceResponsibleUserId (null: nobody).
  attendanceOfficer: LocalizedName | null;
}


// ===== The current term (card "الفصل الحالي") =====

export interface DashboardTerm extends LocalizedName {
  yearName: string;          // "2026/2027"
  startDate: string;         // date only: "2026-09-01"
  endDate: string;           // date only: "2027-01-14"
  areGradesClosed: boolean;
}


// ===== Everything one dashboard needs =====

export interface DashboardData {
  today: TodayAttendance;
  stats: DashboardStats;
  attention: DashboardAttention;
  term: DashboardTerm;
}
