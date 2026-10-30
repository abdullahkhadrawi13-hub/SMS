import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { DateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { TranslatePipe } from '@ngx-translate/core';

import { AttendanceHeader } from '../attendance-header/attendance-header';
import { RecordTab } from '../record/record-tab/record-tab';
import { DailySummaryTab } from '../daily-summary/daily-summary-tab/daily-summary-tab';
import { AbsenteesTab } from '../absentees/absentees-tab/absentees-tab';

import {
  ATTENDANCE_LOCALE_AR,
  ATTENDANCE_LOCALE_EN,
  AttendanceSheetTarget,
  AttendanceTab
} from '../shared/attendance-shared';

import { AttendanceAccessService } from '../../../core/services/attendance-access';
import { Language } from '../../../core/services/language';

// The attendance page (Admin, Assistant Principal, the attendance officer).
// It only holds the header and the tabs; each tab loads its own data:
//   1. Record attendance  -> record/record-tab
//   2. Daily summary      -> daily-summary/daily-summary-tab
//   3. Absentees          -> absentees/absentees-tab
//
// The active tab is kept in the URL: /attendance (record),
// /attendance?tab=summary or /attendance?tab=absentees.
// The three tabs stay alive while switching ([hidden], not @if), so the
// unsaved marks of the sheet and the absentees search are not lost.
@Component({
  selector: 'app-attendance-page',
  imports: [
    AttendanceHeader,
    RecordTab,
    DailySummaryTab,
    AbsenteesTab,

    MatIconModule,
    MatTabsModule,
    TranslatePipe
  ],
  templateUrl: './attendance-page.html',
  styleUrl: './attendance-page.css',
})
export class AttendancePage {

  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly language = inject(Language);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  // =========================
  // Access (GET /api/attendance/my-access)
  // =========================
  // The answer is already loaded: attendanceAccessGuard waits for it
  // before this page opens.

  // The daily summary is for everyone who records attendance.
  // The attendance officer sees the summary of today only.
  readonly canViewSummary = this.attendanceAccess.canViewSummary;

  // The absentees list has the same rules as the daily summary:
  // Admin and AssistantPrincipal any day, the attendance officer today only.
  readonly canViewAbsentees = this.attendanceAccess.canViewSummary;

  // The active tab comes from the URL (?tab=summary / ?tab=absentees),
  // see the queryParamMap subscription in the constructor.
  readonly activeTab = signal<AttendanceTab>('record');

  // Go up by one every time the summary or the absentees tab is opened
  // (or clicked again): the tab then loads fresh data, because attendance
  // may have been changed in the record tab.
  readonly summaryReloadKey = signal(0);
  readonly absenteesReloadKey = signal(0);

  // The record tab: the page asks it to open a sheet
  // (from the daily summary or the absentees tab).
  private readonly recordTab = viewChild(RecordTab);

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  constructor() {

    // The calendar follows the current language
    // (Arabic names with Latin digits, or English).
    effect(() => {
      this.dateAdapter.setLocale(
        this.isArabic()
          ? ATTENDANCE_LOCALE_AR
          : ATTENDANCE_LOCALE_EN
      );
    });

    // The tab follows the URL: /attendance, ?tab=summary or ?tab=absentees.
    // (A tab click only changes the URL; this shows the tab.)
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.showTab(this.toAllowedTab(params.get('tab')));
      });
  }


  // =========================
  // Tabs
  // =========================

  // A tab click: only the URL changes (?tab=...);
  // the queryParamMap subscription shows the tab.
  selectTab(tab: AttendanceTab): void {

    tab = this.toAllowedTab(tab);

    // The same tab again: load its data again (fresh numbers).
    if (tab === this.activeTab()) {
      this.showTab(tab);
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'record' ? null : tab },
      queryParamsHandling: 'merge',
      // Replace: a tab is not a new step for the browser's "Back".
      replaceUrl: true
    });
  }

  // Shows the tab and tells it to load its data.
  private showTab(tab: AttendanceTab): void {

    this.activeTab.set(tab);

    // Always show fresh data when the summary or the absentees list is opened
    // (attendance may have been changed in the record tab).
    if (tab === 'summary') {
      this.summaryReloadKey.update(key => key + 1);
    }

    if (tab === 'absentees') {
      this.absenteesReloadKey.update(key => key + 1);
    }
  }

  // The tab from the URL, or "record" when it is unknown
  // or the user may not see it.
  private toAllowedTab(value: string | null): AttendanceTab {

    switch (value) {
      case 'summary':
        return this.canViewSummary() ? 'summary' : 'record';
      case 'absentees':
        return this.canViewAbsentees() ? 'absentees' : 'record';
      default:
        return 'record';
    }
  }


  // =========================
  // Open a sheet from another tab
  // =========================

  // The daily summary or the absentees tab asks to open the sheet of a
  // section on a date: move to the record tab and let it open the sheet
  // (it refuses, with a warning, while it has unsaved changes).
  openSheet(target: AttendanceSheetTarget): void {
    this.selectTab('record');
    this.recordTab()?.openSheet(target);
  }

}
