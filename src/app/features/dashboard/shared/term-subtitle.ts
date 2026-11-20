import { DashboardCurrentTerm } from '../../../core/models/dashboard';


// The page subtitle of the Student and Parent dashboards:
// "الفصل الأول · 2026/2027", or "لا يوجد فصل دراسي حالي." (currentTerm: null).
export interface TermSubtitle {
  key: string;
  params: Record<string, string>;
}

export function getTermSubtitle(term: DashboardCurrentTerm | null | undefined, isArabic: boolean): TermSubtitle {
  if (!term) {
    return { key: 'DASHBOARD.NO_TERM', params: {} };
  }

  return {
    key: 'DASHBOARD.TERM_SUBTITLE',
    params: { term: isArabic ? term.termNameAr : term.termNameEn, year: term.yearName },
  };
}
