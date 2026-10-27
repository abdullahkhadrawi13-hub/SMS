import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { DateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, map, Observable, of, Subscription } from 'rxjs';

import { AttendanceHeader } from '../attendance-header/attendance-header';
import { AttendanceSelector } from '../attendance-selector/attendance-selector';
import { AttendanceSheet } from '../attendance-sheet/attendance-sheet';
import { AttendanceSummary } from '../attendance-summary/attendance-summary';
import { AttendanceAbsentees } from '../attendance-absentees/attendance-absentees';

import {
  AbsenteeSection,
  ATTENDANCE_LOCALE_AR,
  ATTENDANCE_LOCALE_EN,
  AttendanceDraft,
  AttendanceSheetStats,
  AttendanceStatusChange,
  AttendanceTab,
  todayApiDate
} from '../attendance';

import { ApiResponse } from '../../../core/models/api-response';
import { ApiMessageService } from '../../../core/services/api-message';
import { AttendanceService } from '../../../core/services/attendance';
import { AttendanceAccessService } from '../../../core/services/attendance-access';
import { Language } from '../../../core/services/language';
import { SchoolClassesService } from '../../../core/services/school-classes';
import { SectionsService } from '../../../core/services/sections';
import { Permissions } from '../../../core/services/permissions';
import { ActionResult } from '../../../shared/services/action-result';
import { SchoolClassSimpleDto } from '../../../core/models/school-class';
import { ActiveSectionDto } from '../../../core/models/section';
import {
  ATTENDANCE_PRESENT,
  AttendanceAbsentees as AttendanceAbsenteesData,
  AttendanceDailySummary,
  AttendanceEntry,
  AttendanceSheet as AttendanceSheetData,
  AttendanceSummarySection
} from '../../../core/models/attendance';

// The result of one save request (one POST or one PUT).
// The message always comes from the backend (Arabic or English).
interface AttendanceSaveResult {
  success: boolean;
  message: string;
}

@Component({
  selector: 'app-attendance-page',
  imports: [
    AttendanceHeader,
    AttendanceSelector,
    AttendanceSheet,
    AttendanceSummary,
    AttendanceAbsentees,

    MatIconModule,
    MatTabsModule,
    TranslatePipe
  ],
  templateUrl: './attendance-page.html',
  styleUrl: './attendance-page.css',
})
export class AttendancePage implements OnInit {

  private readonly attendanceService = inject(AttendanceService);
  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);

  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(Language);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  private readonly permissions = inject(Permissions);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  // Today in the API format (YYYY-MM-DD). Future dates are not allowed.
  readonly today = todayApiDate();

  // =========================
  // Access (GET /api/attendance/my-access)
  // =========================
  // The answer is already loaded: attendanceAccessGuard waits for it
  // before this page opens.

  // The attendance officer records today only: the date is locked.
  readonly todayOnly = this.attendanceAccess.todayOnly;

  // The daily summary is for everyone who records attendance.
  // The attendance officer sees the summary of today only.
  readonly canViewSummary = this.attendanceAccess.canViewSummary;

  // The absentees list has the same rules as the daily summary:
  // Admin and AssistantPrincipal any day, the attendance officer today only.
  readonly canViewAbsentees = this.attendanceAccess.canViewSummary;

  // Admin and AssistantPrincipal: a student's name opens the student page.
  readonly canOpenStudent = this.attendanceAccess.fullAccess;

  // Admin only: "Link a parent" for a student with no parent.
  readonly canLinkParent = this.permissions.canManageParents;

  // The active tab comes from the URL (?tab=summary / ?tab=absentees),
  // see the queryParamMap subscription in the constructor.
  readonly activeTab = signal<AttendanceTab>('record');

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // =========================
  // Record tab: selection
  // =========================

  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<ActiveSectionDto[]>([]);
  readonly sectionsLoading = signal(false);

  readonly classId = signal<number | null>(null);
  readonly sectionId = signal<number | null>(null);
  readonly date = signal(this.today);


  // =========================
  // Record tab: sheet
  // =========================

  // The sheet as saved in the backend.
  readonly sheet = signal<AttendanceSheetData | null>(null);

  // The status chosen on the screen for each student (not saved yet).
  readonly draft = signal<AttendanceDraft>({});

  readonly sheetLoading = signal(false);
  readonly sheetError = signal<string | null>(null);
  readonly saving = signal(false);

  readonly stats = computed<AttendanceSheetStats>(() => {

    const draft = this.draft();

    const stats: AttendanceSheetStats = {
      total: 0,
      present: 0,
      absent: 0,
      unmarked: 0,
      changes: 0
    };

    for (const student of this.sheet()?.students ?? []) {

      const status = draft[student.studentId] ?? null;

      stats.total++;

      if (status === null) {
        stats.unmarked++;
      } else if (status === ATTENDANCE_PRESENT) {
        stats.present++;
      } else {
        stats.absent++;
      }

      if (status !== student.status) {
        stats.changes++;
      }
    }

    return stats;
  });

  // While there are unsaved changes (or a save is running) the
  // class / section / date cannot be changed, so nothing is lost by mistake.
  readonly selectionLocked = computed(
    () => this.stats().changes > 0 || this.saving()
  );

  // Names of the selected class and section, shown in the sheet title.
  readonly selectedClassName = computed(() => {

    const schoolClass = this.classes().find(
      c => c.schoolClassId === this.classId()
    );

    if (!schoolClass) {
      return '';
    }

    return this.isArabic()
      ? schoolClass.classNameAr
      : schoolClass.classNameEn;
  });

  readonly selectedSectionName = computed(() => {

    const section = this.sections().find(
      s => s.sectionId === this.sectionId()
    );

    if (!section) {
      return '';
    }

    return this.isArabic()
      ? section.sectionAr
      : section.sectionEn;
  });


  // =========================
  // Summary tab
  // =========================

  readonly summaryDate = signal(this.today);
  readonly summary = signal<AttendanceDailySummary | null>(null);
  readonly summaryLoading = signal(false);
  readonly summaryError = signal<string | null>(null);


  // =========================
  // Absentees tab
  // =========================

  readonly absenteesDate = signal(this.today);
  readonly absentees = signal<AttendanceAbsenteesData | null>(null);
  readonly absenteesLoading = signal(false);
  readonly absenteesError = signal<string | null>(null);

  // The search and the selected section stay when the user changes the
  // tab or the date. The selected section stays selected even on a date
  // with no absent students in it (the tab then says so).
  readonly absenteesSearch = signal('');
  readonly absenteesSection = signal<AbsenteeSection | null>(null);


  // Running requests. A new request cancels the previous one,
  // so an old response never replaces a newer selection.
  private sectionsRequest?: Subscription;
  private sheetRequest?: Subscription;
  private summaryRequest?: Subscription;
  private absenteesRequest?: Subscription;


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

  ngOnInit(): void {
    this.loadClasses();
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

  // Shows the tab and loads its data.
  private showTab(tab: AttendanceTab): void {

    this.activeTab.set(tab);

    // Always show fresh data when the summary or the absentees list is opened
    // (attendance may have been changed in the record tab).
    if (tab === 'summary') {
      this.loadSummary();
    }

    if (tab === 'absentees') {
      this.loadAbsentees();
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
  // Selection
  // =========================

  // Active classes only
  private loadClasses(): void {

    this.classesService
      .getActiveSchoolClasses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.classes.set(response.success ? response.data : []);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load classes:', error);

          this.classes.set([]);
          this.sheetError.set(this.apiMessageService.getErrorMessage(error));
        }
      });
  }

  // Active sections of the selected class only.
  // selectSectionId: a section to select once the list is loaded
  // (used when a section is opened from the summary tab).
  private loadSections(
    classId: number,
    selectSectionId: number | null = null
  ): void {

    this.sectionsRequest?.unsubscribe();
    this.sectionsLoading.set(true);

    this.sectionsRequest = this.sectionsService
      .getActiveSectionsByClass(classId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          const sections = response.success ? response.data : [];

          this.sections.set(sections);
          this.sectionsLoading.set(false);

          if (
            selectSectionId !== null
            && sections.some(s => s.sectionId === selectSectionId)
          ) {
            this.sectionId.set(selectSectionId);
            this.loadSheet();
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load sections:', error);

          this.sections.set([]);
          this.sectionsLoading.set(false);
          this.sheetError.set(this.apiMessageService.getErrorMessage(error));
        }
      });
  }

  onClassChange(classId: number | null): void {

    this.classId.set(classId);

    // Always reset the section when the class changes
    this.sectionId.set(null);
    this.sections.set([]);

    // No section is selected now, so this clears the sheet
    this.loadSheet();

    if (classId !== null) {
      this.loadSections(classId);
    }
  }

  onSectionChange(sectionId: number | null): void {
    this.sectionId.set(sectionId);
    this.loadSheet();
  }

  onDateChange(date: string): void {

    // The attendance officer cannot leave today
    if (this.todayOnly()) {
      return;
    }

    this.date.set(date);
    this.loadSheet();
  }


  // =========================
  // Sheet
  // =========================

  // GET /api/attendance/sheet
  // keepDraft: keep what the user chose on the screen (used after saving,
  // so anything that failed to save stays visible as an unsaved change).
  private loadSheet(keepDraft = false): void {

    const classId = this.classId();
    const sectionId = this.sectionId();
    const date = this.date();

    this.sheetRequest?.unsubscribe();
    this.sheetError.set(null);

    // The sheet needs a class and a section
    if (classId === null || sectionId === null) {
      this.sheet.set(null);
      this.draft.set({});
      this.sheetLoading.set(false);
      return;
    }

    if (!keepDraft) {
      this.sheet.set(null);
      this.draft.set({});
      this.sheetLoading.set(true);
    }

    this.sheetRequest = this.attendanceService
      .getSheet(date, classId, sectionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.sheetLoading.set(false);

          if (!response.success || !response.data) {
            this.sheet.set(null);
            this.draft.set({});
            this.sheetError.set(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          const previousDraft = keepDraft ? this.draft() : {};
          const draft: AttendanceDraft = {};

          // Students that are not recorded yet start with no status (null).
          for (const student of response.data.students) {
            draft[student.studentId] =
              previousDraft[student.studentId] ?? student.status;
          }

          this.sheet.set(response.data);
          this.draft.set(draft);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load attendance sheet:', error);

          this.sheetLoading.set(false);
          this.sheet.set(null);
          this.draft.set({});
          this.sheetError.set(this.apiMessageService.getErrorMessage(error));
        }
      });
  }

  onStatusChange(change: AttendanceStatusChange): void {
    this.draft.update(draft => ({
      ...draft,
      [change.studentId]: change.status
    }));
  }

  // Marks only the students that have no status yet as present.
  // A status the user already chose is never replaced.
  markRemainingPresent(): void {

    const draft = { ...this.draft() };

    for (const student of this.sheet()?.students ?? []) {
      if ((draft[student.studentId] ?? null) === null) {
        draft[student.studentId] = ATTENDANCE_PRESENT;
      }
    }

    this.draft.set(draft);
  }

  // Back to what is saved in the backend.
  resetChanges(): void {

    const draft: AttendanceDraft = {};

    for (const student of this.sheet()?.students ?? []) {
      draft[student.studentId] = student.status;
    }

    this.draft.set(draft);
  }

  // Save:
  // - students that are not recorded yet go in ONE POST (batch),
  // - recorded students whose status changed get one PUT each,
  // - then the sheet is loaded again.
  saveAttendance(): void {

    const sheet = this.sheet();
    const stats = this.stats();

    if (
      !sheet
      || this.saving()
      || stats.unmarked > 0
      || stats.changes === 0
    ) {
      return;
    }

    const draft = this.draft();

    const newEntries: AttendanceEntry[] = [];
    const requests: Observable<AttendanceSaveResult>[] = [];

    for (const student of sheet.students) {

      const status = draft[student.studentId] ?? null;

      if (status === null) {
        continue;
      }

      if (student.attendanceId === null) {
        newEntries.push({
          studentId: student.studentId,
          status
        });
      } else if (status !== student.status) {
        requests.push(
          this.toSaveResult(
            this.attendanceService.updateAttendance(
              student.attendanceId,
              status
            )
          )
        );
      }
    }

    if (newEntries.length > 0) {
      requests.push(
        this.toSaveResult(
          this.attendanceService.recordAttendance(
            sheet.date,
            newEntries
          )
        )
      );
    }

    if (requests.length === 0) {
      return;
    }

    this.saving.set(true);

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {

        this.saving.set(false);

        const firstError = results.find(result => !result.success);

        if (firstError) {

          // The message of the first request that failed.
          this.actionResult.show('error', firstError.message);

        } else if (results.length === 1) {

          // One request only: show the message the backend sent for it.
          // (The translated message is used only if the backend sent none.)
          this.actionResult.show(
            'success',
            results[0].message
            || this.translate.instant('ATTENDANCE.SHEET.SAVE_SUCCESS')
          );

        } else {

          // Several requests: there is no single backend message for all
          // of them, so one general message is shown.
          this.actionResult.show(
            'success',
            this.translate.instant('ATTENDANCE.SHEET.SAVE_SUCCESS')
          );
        }

        // Refresh the screen from the backend. Anything that was not
        // saved stays on the screen as an unsaved change.
        this.loadSheet(true);
      });
  }

  // Turns a save request into a result: saved or not, with its message.
  // Errors are caught here so one failed request does not cancel the others.
  private toSaveResult(
    request: Observable<ApiResponse<unknown>>
  ): Observable<AttendanceSaveResult> {

    return request.pipe(
      map(response => ({
        success: response.success,
        message: this.apiMessageService.getMessage(response)
      })),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to save attendance:', error);

        return of({
          success: false,
          message: this.apiMessageService.getErrorMessage(error)
        });
      })
    );
  }


  // =========================
  // Summary
  // =========================

  // GET /api/attendance/daily-summary
  private loadSummary(): void {

    this.summaryRequest?.unsubscribe();

    // The old summary stays on the screen while the new one loads
    // (the summary component shows a thin progress bar on top of it).
    this.summaryError.set(null);
    this.summaryLoading.set(true);

    this.summaryRequest = this.attendanceService
      .getDailySummary(this.summaryDate())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.summaryLoading.set(false);

          if (!response.success || !response.data) {
            this.summary.set(null);
            this.summaryError.set(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.summary.set(response.data);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load attendance summary:', error);

          this.summaryLoading.set(false);
          this.summary.set(null);
          this.summaryError.set(this.apiMessageService.getErrorMessage(error));
        }
      });
  }

  onSummaryDateChange(date: string): void {

    // The attendance officer cannot leave today
    if (this.todayOnly()) {
      return;
    }

    this.summaryDate.set(date);
    this.loadSummary();
  }

  // Opens the sheet of a section (on the summary date) in the record tab.
  openSectionSheet(section: AttendanceSummarySection): void {
    this.openSheet(section.classId, section.sectionId, this.summaryDate());
  }


  // =========================
  // Absentees
  // =========================

  // GET /api/attendance/absentees
  private loadAbsentees(): void {

    this.absenteesRequest?.unsubscribe();

    // The old list stays on the screen while the new one loads
    // (the absentees component shows a thin progress bar on top of it).
    this.absenteesError.set(null);
    this.absenteesLoading.set(true);

    this.absenteesRequest = this.attendanceService
      .getAbsentees(this.absenteesDate())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.absenteesLoading.set(false);

          if (!response.success || !response.data) {
            this.absentees.set(null);
            this.absenteesError.set(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.absentees.set(response.data);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load absent students:', error);

          this.absenteesLoading.set(false);
          this.absentees.set(null);
          this.absenteesError.set(this.apiMessageService.getErrorMessage(error));
        }
      });
  }

  onAbsenteesDateChange(date: string): void {

    // The attendance officer cannot leave today
    if (this.todayOnly()) {
      return;
    }

    this.absenteesDate.set(date);
    this.loadAbsentees();
  }

  // Opens the sheet of a section (on the absentees date) in the record tab.
  openAbsenteesSheet(section: AbsenteeSection): void {
    this.openSheet(section.classId, section.sectionId, this.absenteesDate());
  }


  // =========================
  // Open a sheet from another tab
  // =========================

  // Opens the sheet of a section on a date in the record tab
  // (used by the daily summary and the absentees list).
  private openSheet(classId: number, sectionId: number, date: string): void {

    // Do not replace a sheet that has unsaved changes
    if (this.selectionLocked()) {
      this.selectTab('record');

      this.actionResult.show(
        'warning',
        this.translate.instant('ATTENDANCE.SHEET.UNSAVED_BLOCK')
      );
      return;
    }

    this.selectTab('record');

    this.date.set(date);
    this.classId.set(classId);
    this.sectionId.set(null);
    this.sections.set([]);

    // Clears the old sheet until the section list is loaded
    this.loadSheet();

    this.loadSections(classId, sectionId);
  }

}