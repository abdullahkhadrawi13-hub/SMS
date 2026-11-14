import { DashboardSectionRef, LocalizedName } from './dashboard.models';


// Small helpers that put dashboard names in the language of the page.
// Every function receives isArabic, so a computed() that calls it
// updates as soon as the language changes (like shared/utils/person-name.ts).


// "الثامن" / "Grade 8"
export function localName(name: LocalizedName, isArabic: boolean): string {
  return isArabic ? name.nameAr : name.nameEn;
}


// "الثامن ج" / "Grade 8 C"
export function sectionName(section: DashboardSectionRef, isArabic: boolean): string {
  return isArabic
    ? `${section.classNameAr} ${section.sectionNameAr}`
    : `${section.classNameEn} ${section.sectionNameEn}`;
}


// The sections of one class together, the classes joined by " · ":
// "السابع ب · التاسع ج · العاشر أ، ب، ج" / "Grade 7 B · Grade 9 C · Grade 10 A, B, C"
export function groupSectionsByClass(sections: DashboardSectionRef[], isArabic: boolean): string {
  const groups = new Map<string, string[]>();

  for (const section of sections) {
    const className = isArabic ? section.classNameAr : section.classNameEn;
    const name = isArabic ? section.sectionNameAr : section.sectionNameEn;

    groups.set(className, [...(groups.get(className) ?? []), name]);
  }

  const separator = isArabic ? '، ' : ', ';

  return [...groups.entries()]
    .map(([className, names]) => `${className} ${names.join(separator)}`)
    .join(' · ');
}


// A list of names joined in the language of the page: "العلوم، الرياضيات" / "Science, Mathematics"
export function joinNames(names: string[], isArabic: boolean): string {
  return names.join(isArabic ? '، ' : ', ');
}
