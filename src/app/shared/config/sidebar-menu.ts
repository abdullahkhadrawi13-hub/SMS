export interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles: number[];
}

export const SIDEBAR_MENU: MenuItem[] = [

  {
    label: 'SIDEBAR.DASHBOARD',
    icon: 'dashboard',
    route: '/dashboard',
    roles: [0, 1, 2, 3, 4]
  },

  {
    label: 'SIDEBAR.STUDENTS',
    icon: 'school',
    route: '/students',
    roles: [0, 1, 2]
  },

  {
    label: 'SIDEBAR.TEACHERS',
    icon: 'person',
    route: '/teachers',
    roles: [0, 1]
  },

  {
    label: 'SIDEBAR.PARENTS',
    icon: 'family_restroom',
    route: '/parents',
    roles: [0, 1]
  },

  {
    label: 'SIDEBAR.CLASSES',
    icon: 'class',
    route: '/classes',
    roles: [0, 1, 2]
  },

  {
    label: 'SIDEBAR.SECTIONS',
    icon: 'groups',
    route: '/sections',
    roles: [0, 1, 2]
  },

  {
    label: 'SIDEBAR.SUBJECTS',
    icon: 'menu_book',
    route: '/subjects',
    roles: [0, 1, 2]
  },

  {
    label: 'SIDEBAR.TIMETABLE',
    icon: 'schedule',
    route: '/timetable',
    roles: [0, 1, 2, 3, 4]
  },

  {
    label: 'SIDEBAR.ATTENDANCE',
    icon: 'fact_check',
    route: '/attendance',
    roles: [0, 1, 2, 3, 4]
  },

  {
    label: 'SIDEBAR.GRADES',
    icon: 'grade',
    route: '/grades',
    roles: [0, 1, 2, 3, 4]
  },

  {
    label: 'SIDEBAR.RESULTS',
    icon: 'assessment',
    route: '/results',
    roles: [0, 1, 2, 3, 4]
  },

  {
    label: 'SIDEBAR.ACADEMIC_HISTORY',
    icon: 'history_edu',
    route: '/academic-history',
    roles: [0, 3, 4]
  },

  {
    label: 'SIDEBAR.REPORTS',
    icon: 'description',
    route: '/reports',
    roles: [0, 1]
  },

  {
    label: 'SIDEBAR.SETTINGS',
    icon: 'settings',
    route: '/settings',
    roles: [0]
  }

];