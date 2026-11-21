// School settings (API Reference, section 12). Admin only, except the
// school information (SchoolInfo below), which every signed-in user reads.
// One settings row for the whole school (created by the backend
// the first time it is read).


// The rollover setting: how many failed subjects (or more) make the
// rollover preview suggest "Repeat" for a student (section 13).
// The same shape is sent to and returned by
// PUT /api/schoolsettings/promotion, and returned by
// GET /api/schoolsettings/promotion. Between 1 and 50 (default 1).
export interface PromotionSettings {
  failedSubjectsToRepeat: number;
}


// The school information (PR #51): GET /api/schoolsettings/school.
// Every signed-in user can read it; only the Admin saves it (PUT, not
// used by a screen yet).
//
// weeklyDaysOff: day numbers like JavaScript Date.getDay()
// (0 Sunday … 6 Saturday), always in order. [] = no days off.
// Until the Admin saves it: names "", phone and address null,
// weeklyDaysOff [5, 6] (Friday and Saturday).
export interface SchoolInfo {
  schoolNameAr: string;
  schoolNameEn: string;
  phoneNumber: string | null;
  address: string | null;
  weeklyDaysOff: number[];
}

// The backend's default, used when the school information cannot be read.
export const DEFAULT_WEEKLY_DAYS_OFF: readonly number[] = [5, 6];
