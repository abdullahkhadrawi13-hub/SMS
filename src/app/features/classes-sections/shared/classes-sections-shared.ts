import { AcademicTerm } from '../../../core/models/academic-term';
import { AcademicYear } from '../../../core/models/academic-year';
import { SchoolClass } from '../../../core/models/school-class';
import { Section } from '../../../core/models/section';


// =========================
// Shared types and helpers of the "Classes & Sections" section
// =========================


// One academic term with the name of its year
// ("First Term · 2026/2027"): the term dropdown of a class page.
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


// Classes in school order (by level). Both pages sort the same way.
export function sortClassesByLevel(classes: SchoolClass[]): SchoolClass[] {
  return [...classes].sort((a, b) => a.level - b.level);
}


// Sections in name order (أ، ب، ج...).
export function sortSectionsByName(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => a.sectionAr.localeCompare(b.sectionAr, 'ar'));
}


// An active section with no students: shown in yellow ("No students"),
// because the admin may need to move students into it or deactivate it.
export function isEmptySection(section: Section): boolean {
  return section.isActive && section.studentCount === 0;
}


// The numbers of one class in a term (its sections, already loaded).
export interface ClassCounts {
  // Active sections only (an inactive section does not count).
  activeSections: number;
  // Students of all the class's sections.
  students: number;
}

export function getClassCounts(sections: Section[]): ClassCounts {
  return {
    activeSections: sections.filter(s => s.isActive).length,
    students: sections.reduce((sum, s) => sum + s.studentCount, 0)
  };
}


// The "Status" filter of a class page (filtered in the page, no request).
export type SectionStatusFilter = 'all' | 'active' | 'inactive';
