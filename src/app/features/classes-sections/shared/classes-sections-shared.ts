import { AcademicTerm } from '../../../core/models/academic-term';
import { AcademicYear } from '../../../core/models/academic-year';
import { SchoolClass } from '../../../core/models/school-class';
import { CardColor, getCardColor } from '../../../shared/constants/card-colors';


// =========================
// Shared types and helpers of the "Classes & Sections" section
// =========================


// One academic term with the name of its year
// ("First Term · 2026/2027"): the term dropdown and the header note.
// A term has no year name of its own, so the years are loaded too.
export interface ClassesSectionsTerm {
  academicTermId: number;
  nameAr: string;
  nameEn: string;
  yearName: string;
  startDate: string;
  isCurrent: boolean;
}


// Terms with their year names, newest first.
export function toClassesSectionsTerms(
  terms: AcademicTerm[],
  years: AcademicYear[]
): ClassesSectionsTerm[] {

  const yearNames = new Map(
    years.map(year => [year.academicYearId, year.yearName])
  );

  return terms
    .map(term => ({
      academicTermId: term.academicTermId,
      nameAr: term.nameAr,
      nameEn: term.nameEn,
      yearName: yearNames.get(term.academicYearId) ?? '',
      startDate: term.startDate,
      isCurrent: term.isCurrent
    }))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}


// "First Term · 2026/2027" in the current language.
export function getTermLabel(
  term: ClassesSectionsTerm,
  isArabic: boolean
): string {

  const name = isArabic ? term.nameAr : term.nameEn;

  return term.yearName ? `${name} · ${term.yearName}` : name;
}


// Classes in school order (by level). Both pages sort the same way,
// so a class keeps the same color on its card and on its own page.
export function sortClassesByLevel(classes: SchoolClass[]): SchoolClass[] {
  return [...classes].sort((a, b) => a.level - b.level);
}


// Grey colors of an inactive class (its card and its page).
export const INACTIVE_CLASS_COLOR: CardColor = {
  main: '#9ca3af',
  soft: '#f3f4f6',
  dark: '#4b5563'
};


// The color of a class: its position among all the classes
// (sorted by level), or grey when the class is inactive.
export function getClassColor(
  schoolClass: SchoolClass,
  position: number
): CardColor {

  return schoolClass.isActive
    ? getCardColor(position)
    : INACTIVE_CLASS_COLOR;
}


// The "Status" filter of a class page (filtered in the page, no request).
export type SectionStatusFilter = 'all' | 'active' | 'inactive';
