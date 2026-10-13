import { UserRole } from '../../../core/models/user-role';

export interface MenuItem {
  label: string;
  icon: string;
  route: string;

  // The roles that see this item in the sidebar.
  roles: UserRole[];
}

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

  // "My classes": the teacher's own classes and subjects
  // (GET /api/teacherassignments/mine). It replaces Classes, Sections
  // and Subjects for the teacher, who gets 403 on those lists.
  {
    label: 'SIDEBAR.MY_CLASSES',
    icon: 'co_present',
    route: '/my-classes',
    roles: [Teacher]
  },

  {
    label: 'SIDEBAR.STUDENTS',
    icon: 'school',
    route: '/students',
    roles: [Admin, AssistantPrincipal, Teacher]
  },

  {
    label: 'SIDEBAR.TEACHERS',
    icon: 'person',
    route: '/teachers',
    roles: [Admin, AssistantPrincipal]
  },

  {
    label: 'SIDEBAR.PARENTS',
    icon: 'family_restroom',
    route: '/parents',
    roles: [Admin, AssistantPrincipal]
  },

  {
    label: 'SIDEBAR.CLASSES',
    icon: 'class',
    route: '/classes',
    roles: [Admin, AssistantPrincipal]
  },

  {
    label: 'SIDEBAR.SECTIONS',
    icon: 'groups',
    route: '/sections',
    roles: [Admin, AssistantPrincipal]
  },

  {
    label: 'SIDEBAR.SUBJECTS',
    icon: 'menu_book',
    route: '/subjects',
    roles: [Admin, AssistantPrincipal]
  },

  {
    label: 'SIDEBAR.TIMETABLE',
    icon: 'schedule',
    route: '/timetable',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent]
  },

  {
    label: 'SIDEBAR.ATTENDANCE',
    icon: 'fact_check',
    route: '/attendance',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent]
  },

  {
    label: 'SIDEBAR.GRADES',
    icon: 'grade',
    route: '/grades',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent]
  },

  {
    label: 'SIDEBAR.RESULTS',
    icon: 'assessment',
    route: '/results',
    roles: [Admin, AssistantPrincipal, Teacher, Student, Parent]
  },

  {
    label: 'SIDEBAR.ACADEMIC_HISTORY',
    icon: 'history_edu',
    route: '/academic-history',
    roles: [Admin, Student, Parent]
  },

  {
    label: 'SIDEBAR.REPORTS',
    icon: 'description',
    route: '/reports',
    roles: [Admin, AssistantPrincipal]
  },

  {
    label: 'SIDEBAR.SETTINGS',
    icon: 'settings',
    route: '/settings',
    roles: [Admin]
  }

];