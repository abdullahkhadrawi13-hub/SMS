// School settings (API Reference, section 12). Admin only.
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
