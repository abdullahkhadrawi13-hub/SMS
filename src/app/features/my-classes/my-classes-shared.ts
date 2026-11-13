import { SubjectPlan } from '../../core/models/subject-plan';
import { StatusBadgeTone } from '../../shared/components/status-badge/status-badge';
import { getPlanStatus, PLAN_STATUS_BADGE } from '../subjects/shared/subjects-shared';

import { MyPlanStatus } from './my-class';


// =========================
// Shared helpers of the "My classes" section
// (the cards page and the assessments page)
// =========================


// The plan state of a subject. 'none' = the administration has not made the plan yet.
export function myPlanStatus(plan: SubjectPlan | null): MyPlanStatus {
  return plan ? getPlanStatus(plan) : 'none';
}


// The badge of each state: the same words and colours the Admin sees
// (PLAN_STATUS_BADGE of the Subjects section), plus "No plan".
export interface MyPlanBadge {
  tone: StatusBadgeTone;
  icon: string | null;
  labelKey: string;
}

export const MY_PLAN_BADGE: Record<MyPlanStatus, MyPlanBadge> = {
  locked: {
    tone: PLAN_STATUS_BADGE.locked.tone,
    icon: PLAN_STATUS_BADGE.locked.icon,
    labelKey: PLAN_STATUS_BADGE.locked.labelKey,
  },
  ready: {
    tone: PLAN_STATUS_BADGE.ready.tone,
    icon: PLAN_STATUS_BADGE.ready.icon,
    labelKey: PLAN_STATUS_BADGE.ready.labelKey,
  },
  incomplete: {
    tone: PLAN_STATUS_BADGE.incomplete.tone,
    icon: PLAN_STATUS_BADGE.incomplete.icon,
    labelKey: PLAN_STATUS_BADGE.incomplete.labelKey,
  },
  none: {
    tone: 'neutral',
    icon: null,
    labelKey: 'SUBJECTS.PLAN_STATUS.NONE',
  },
};
