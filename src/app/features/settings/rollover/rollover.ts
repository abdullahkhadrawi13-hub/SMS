import { AcademicTerm } from '../../../core/models/academic-term';
import { AcademicYear } from '../../../core/models/academic-year';
import {
  RolloverStudent,
  RolloverSuggestion
} from '../../../core/models/rollover';

// Shared types and helpers of the rollover page (UI only).


// =====================================================
// Decisions
// =====================================================

// What the Admin decided for one student (new-year rollover only).
// promote: moves to the next class (or graduates in a graduation class).
// repeat : stays in the same class and section (sent in repeatStudentIds).
export type RolloverDecision = 'promote' | 'repeat';

// studentId -> decision. null = the Admin has not decided yet
// (only for NeedsDecision). Students that cannot be decided
// (Copy, AlreadyPlaced, NoTarget) are not in the map.
export type RolloverDecisions = Record<number, RolloverDecision | null>;

// The Admin can choose "promote" or "repeat" for these suggestions only.
const DECIDABLE: RolloverSuggestion[] = [
  RolloverSuggestion.Promote,
  RolloverSuggestion.Repeat,
  RolloverSuggestion.Graduate,
  RolloverSuggestion.NeedsDecision
];

export function isDecidable(student: RolloverStudent): boolean {
  return DECIDABLE.includes(student.suggestion);
}

// The decision the page starts with:
// Repeat → repeat, Promote / Graduate → promote,
// NeedsDecision → null (the Admin must choose: the API promotes
// everyone who is not in repeatStudentIds, so it is never left to chance).
export function defaultDecision(
  student: RolloverStudent
): RolloverDecision | null {

  switch (student.suggestion) {
    case RolloverSuggestion.Repeat:
      return 'repeat';

    case RolloverSuggestion.Promote:
    case RolloverSuggestion.Graduate:
      return 'promote';

    default:
      return null;
  }
}

// The starting decisions of a preview.
// keep: the decisions already taken (when the same preview is reloaded,
// for example after "Check again"); a student keeps his decision.
export function buildDecisions(
  students: RolloverStudent[],
  keep: RolloverDecisions = {}
): RolloverDecisions {

  const decisions: RolloverDecisions = {};

  for (const student of students) {

    if (!isDecidable(student)) {
      continue;
    }

    decisions[student.studentId] =
      student.studentId in keep
        ? keep[student.studentId]
        : defaultDecision(student);
  }

  return decisions;
}

// How many decisions the Admin changed by hand: a decision that is not
// the starting one (a NeedsDecision student counts once decided).
// Used before saving the rule behind "Repeat": the new preview puts
// every decision back to its suggestion.
export function countChangedDecisions(
  students: RolloverStudent[],
  decisions: RolloverDecisions
): number {

  return students.filter(student =>
    isDecidable(student)
    && student.studentId in decisions
    && decisions[student.studentId] !== defaultDecision(student)
  ).length;
}

// A promoted student with no target class graduates
// (a graduation class has no next class).
export function graduatesIfPromoted(student: RolloverStudent): boolean {
  return isDecidable(student) && student.targetClassId === null;
}


// =====================================================
// Suggestion badge
// =====================================================

// Color of a badge; each tone is defined in the components' CSS (.tone-...).
export type SuggestionTone =
  'blue' | 'green' | 'orange' | 'gold' | 'red' | 'grey' | 'dark-red';

export interface SuggestionStyle {
  labelKey: string;
  icon: string;
  tone: SuggestionTone;
}

export const SUGGESTION_STYLE: Record<RolloverSuggestion, SuggestionStyle> = {
  [RolloverSuggestion.Copy]:          { labelKey: 'ROLLOVER.SUGGESTION.COPY',           icon: 'content_copy',    tone: 'blue' },
  [RolloverSuggestion.Promote]:       { labelKey: 'ROLLOVER.SUGGESTION.PROMOTE',        icon: 'trending_up',     tone: 'green' },
  [RolloverSuggestion.Repeat]:        { labelKey: 'ROLLOVER.SUGGESTION.REPEAT',         icon: 'replay',          tone: 'orange' },
  [RolloverSuggestion.Graduate]:      { labelKey: 'ROLLOVER.SUGGESTION.GRADUATE',       icon: 'school',          tone: 'gold' },
  [RolloverSuggestion.NeedsDecision]: { labelKey: 'ROLLOVER.SUGGESTION.NEEDS_DECISION', icon: 'help',            tone: 'red' },
  [RolloverSuggestion.AlreadyPlaced]: { labelKey: 'ROLLOVER.SUGGESTION.ALREADY_PLACED', icon: 'event_available', tone: 'grey' },
  [RolloverSuggestion.NoTarget]:      { labelKey: 'ROLLOVER.SUGGESTION.NO_TARGET',      icon: 'block',           tone: 'dark-red' }
};

// The order of the filter chips.
export const NEW_YEAR_SUGGESTIONS: RolloverSuggestion[] = [
  RolloverSuggestion.Promote,
  RolloverSuggestion.Repeat,
  RolloverSuggestion.Graduate,
  RolloverSuggestion.NeedsDecision,
  RolloverSuggestion.AlreadyPlaced,
  RolloverSuggestion.NoTarget
];

export const SAME_YEAR_SUGGESTIONS: RolloverSuggestion[] = [
  RolloverSuggestion.Copy,
  RolloverSuggestion.AlreadyPlaced,
  RolloverSuggestion.NoTarget
];


// =====================================================
// Class groups
// =====================================================

// The students of one class of the source term (one panel).
export interface ClassGroupView {
  classId: number;
  classNameAr: string;
  classNameEn: string;

  // The class the group moves to (from its first student with a target).
  // null when nobody in the group has one.
  targetClassNameAr: string | null;
  targetClassNameEn: string | null;

  // The class has no next class: promoted students graduate.
  isGraduation: boolean;

  students: RolloverStudent[];
}

// Students grouped by their class in the source term,
// in the order the API returns them.
export function groupByClass(
  students: RolloverStudent[]
): ClassGroupView[] {

  const groups = new Map<number, ClassGroupView>();

  for (const student of students) {

    let group = groups.get(student.fromClassId);

    if (!group) {
      group = {
        classId: student.fromClassId,
        classNameAr: student.fromClassNameAr,
        classNameEn: student.fromClassNameEn,
        targetClassNameAr: null,
        targetClassNameEn: null,
        isGraduation: false,
        students: []
      };

      groups.set(student.fromClassId, group);
    }

    group.students.push(student);

    // The destination of the class: the first student who would move there.
    // AlreadyPlaced shows the real placement, so it is not used here.
    if (
      group.targetClassNameAr === null &&
      student.targetClassId !== null &&
      student.suggestion !== RolloverSuggestion.AlreadyPlaced
    ) {
      group.targetClassNameAr = student.targetClassNameAr;
      group.targetClassNameEn = student.targetClassNameEn;
    }

    if (graduatesIfPromoted(student)) {
      group.isGraduation = true;
    }
  }

  return [...groups.values()];
}


// =====================================================
// Counts
// =====================================================

// What will happen when the rollover runs, with the Admin's decisions.
export interface RolloverTally {
  copy: number;
  promote: number;
  repeat: number;
  graduate: number;
  alreadyPlaced: number;
  noTarget: number;

  // NeedsDecision students the Admin has not decided yet.
  pending: number;
}

export function countOutcomes(
  students: RolloverStudent[],
  decisions: RolloverDecisions
): RolloverTally {

  const tally: RolloverTally = {
    copy: 0,
    promote: 0,
    repeat: 0,
    graduate: 0,
    alreadyPlaced: 0,
    noTarget: 0,
    pending: 0
  };

  for (const student of students) {

    switch (student.suggestion) {

      case RolloverSuggestion.Copy:
        tally.copy++;
        continue;

      case RolloverSuggestion.AlreadyPlaced:
        tally.alreadyPlaced++;
        continue;

      case RolloverSuggestion.NoTarget:
        tally.noTarget++;
        continue;
    }

    const decision = decisions[student.studentId];

    if (decision === null || decision === undefined) {
      tally.pending++;
    } else if (decision === 'repeat') {
      tally.repeat++;
    } else if (graduatesIfPromoted(student)) {
      tally.graduate++;
    } else {
      tally.promote++;
    }
  }

  return tally;
}

// The ids sent as repeatStudentIds.
export function repeatStudentIds(decisions: RolloverDecisions): number[] {
  return Object.entries(decisions)
    .filter(([, decision]) => decision === 'repeat')
    .map(([studentId]) => Number(studentId));
}


// =====================================================
// Source terms
// =====================================================

// One option of the "From term" list.
export interface RolloverTermOption {
  term: AcademicTerm;
  yearName: string;
}

// The current term, its year name, and the terms the Admin can roll
// over from: every term that starts before the current term
// (the API refuses the current term and later ones), newest first.
// The first option is the term just before the current one.
export function buildSourceOptions(
  years: AcademicYear[],
  terms: AcademicTerm[]
): {
  currentTerm: AcademicTerm | null;
  currentYearName: string;
  options: RolloverTermOption[];
} {

  const yearName = (yearId: number) =>
    years.find(year => year.academicYearId === yearId)?.yearName ?? '';

  const currentTerm = terms.find(term => term.isCurrent) ?? null;

  if (!currentTerm) {
    return { currentTerm: null, currentYearName: '', options: [] };
  }

  // The dates are "YYYY-MM-DDT00:00:00" strings, so they compare as text.
  const options = terms
    .filter(term => term.startDate < currentTerm.startDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map(term => ({
      term,
      yearName: yearName(term.academicYearId)
    }));

  return {
    currentTerm,
    currentYearName: yearName(currentTerm.academicYearId),
    options
  };
}
