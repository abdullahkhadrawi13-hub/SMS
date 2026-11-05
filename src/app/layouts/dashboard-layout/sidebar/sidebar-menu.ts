import { UserRole } from '../../../core/models/user-role';

// The groups of the sidebar, in the order they appear.
// An item with no group goes at the top, under no heading (the dashboard).
export type MenuGroup = 'today' | 'records' | 'academic' | 'system';

export interface MenuItem {
  label: string;
  icon: string;
  route: string;

  // The roles that see this item in the sidebar.
  roles: UserRole[];

  // The group the item is shown under. No group = top of the sidebar.
  group?: MenuGroup;

  // The page is not ready yet: the link is dimmed and shows a "Soon" tag.
  // true = not ready for anyone; a list = not ready for these roles only.
  comingSoon?: true | UserRole[];
}

export interface MenuGroupInfo {
  id: MenuGroup | null;

  // Translation key of the group heading. null = no heading.
  label: string | null;
}

export const SIDEBAR_GROUPS: MenuGroupInfo[] = [
  { id: null,       label: null },
  { id: 'today',    label: 'SIDEBAR.GROUP_TODAY' },
  { id: 'records',  label: 'SIDEBAR.GROUP_RECORDS' },
  { id: 'academic', label: 'SIDEBAR.GROUP_ACADEMIC' },
  { id: 'system',   label: 'SIDEBAR.GROUP_SYSTEM' }
];

// Short names for the roles, so the lists below stay easy to read.
// Admin is the same as UserRole.Admin, and so on.
const { Admin, AssistantPrincipal, Teacher, Student, Parent } = UserRole;

export const SIDEBAR_MENU: MenuItem[] = [

  {
    label: 'SIDEBAR.DASHBOARD',
    icon: 'dashboard',
    route: '/dashboard',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent]
  },


  // ===== Today =====

  // "My classes": the teacher's own classes and subjects
  // (GET /api/teacherassignments/mine). It replaces Classes, Sections
  // and Subjects for the teacher, who gets 403 on those lists.
  {
    label: 'SIDEBAR.MY_CLASSES',
    icon: 'co_present',
    route: '/my-classes',
    roles: [Teacher],
    group: 'today'
  },

  // Student and Parent have no attendance endpoints yet:
  // the page opens as Coming Soon for them.
  {
    label: 'SIDEBAR.ATTENDANCE',
    icon: 'fact_check',
    route: '/attendance',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent],
    group: 'today',
    comingSoon: [Student, Parent]
  },

  {
    label: 'SIDEBAR.GRADES',
    icon: 'grade',
    route: '/grades',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent],
    group: 'today'
  },


  // ===== Records =====

  {
    label: 'SIDEBAR.STUDENTS',
    icon: 'school',
    route: '/students',
    roles: [Admin, AssistantPrincipal, Teacher],
    group: 'records'
  },

  {
    label: 'SIDEBAR.TEACHERS',
    icon: 'person',
    route: '/teachers',
    roles: [Admin, AssistantPrincipal],
    group: 'records'
  },

  {
    label: 'SIDEBAR.PARENTS',
    icon: 'family_restroom',
    route: '/parents',
    roles: [Admin, AssistantPrincipal],
    group: 'records'
  },


  // ===== Academic =====

  // Classes and their sections (one section: /classes-sections).
  {
    label: 'SIDEBAR.CLASSES_SECTIONS',
    icon: 'class',
    route: '/classes-sections',
    roles: [Admin, AssistantPrincipal],
    group: 'academic'
  },

  {
    label: 'SIDEBAR.SUBJECTS',
    icon: 'menu_book',
    route: '/subjects',
    roles: [Admin, AssistantPrincipal],
    group: 'academic'
  },

  {
    label: 'SIDEBAR.TIMETABLE',
    icon: 'schedule',
    route: '/timetable',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent],
    group: 'academic',
    comingSoon: true
  },

  {
    label: 'SIDEBAR.RESULTS',
    icon: 'assessment',
    route: '/results',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent],
    group: 'academic',
    comingSoon: true
  },

  {
    label: 'SIDEBAR.ACADEMIC_HISTORY',
    icon: 'history_edu',
    route: '/academic-history',
    roles: [Admin, Student, Parent],
    group: 'academic',
    comingSoon: true
  },


  // ===== System =====

  {
    label: 'SIDEBAR.REPORTS',
    icon: 'description',
    route: '/reports',
    roles: [Admin, AssistantPrincipal],
    group: 'system',
    comingSoon: true
  },

  // AssistantPrincipal: only the academic years option (read only).
  {
    label: 'SIDEBAR.SETTINGS',
    icon: 'settings',
    route: '/settings',
    roles: [Admin, AssistantPrincipal],
    group: 'system'
  }

];