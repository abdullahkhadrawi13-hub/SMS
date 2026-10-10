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

import { DateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, map, Observable, of, Subscription } from 'rxjs';

import { AttendanceHeader } from '../attendance-header/attendance-header';
import { AttendanceSelector } from '../attendance-selector/attendance-selector';
import { AttendanceSheet } from '../attendance-sheet/attendance-sheet';
import { AttendanceSummary } from '../attendance-summary/attendance-summary';

import {
  ATTENDANCE_LOCALE_AR,
  ATTENDANCE_LOCALE_EN,
  ATTENDANCE_PRESENT,
  AttendanceDailySummary,
  AttendanceDraft,
  AttendanceEntry,
  AttendanceSheet as AttendanceSheetData,
  AttendanceSheetStats,
  AttendanceStatusChange,
  AttendanceSummarySection,
  AttendanceTab,
  todayApiDate
} from '../attendance';

import { ApiResponse } from '../../../core/models/api-response';
import { ApiMessageService } from '../../../core/services/api-message';
import { AttendanceService } from '../../../core/services/attendance';
import { AttendanceAccessService } from '../../../core/services/attendance-access';
import { Language } from '../../../core/services/language';
import { SchoolClassesService } from '../../../core/services/school-classes';
import {
  ActiveSectionDto,
  SectionsService
} from '../../../core/services/sections';
import { ActionResult } from '../../../shared/services/action-result';
import { SchoolClassSimpleDto } from '../../classes/school-class';

@Component({
  selector: 'app-attendance-page',
  imports: [
    AttendanceHeader,
    AttendanceSelector,
    AttendanceSheet,
    AttendanceSummary,

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


  // Running requests. A new request cancels the previous one,
  // so an old response never replaces a newer selection.
  private sectionsRequest?: Subscription;
  private sheetRequest?: Subscription;
  private summaryRequest?: Subscription;


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
  }

  ngOnInit(): void {
    this.loadClasses();
  }


  // =========================
  // Tabs
  // =========================

  selectTab(tab: AttendanceTab): void {

    // The summary tab is only for users who can record attendance
    if (tab === 'summary' && !this.canViewSummary()) {
      return;
    }

    this.activeTab.set(tab);

    // Always show fresh numbers when the summary is opened.
    if (tab === 'summary') {
      this.loadSummary();
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
          this.sheetError.set(this.getErrorMessage(error));
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
          this.sheetError.set(this.getErrorMessage(error));
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
          this.sheetError.set(this.getErrorMessage(error));
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
    const requests: Observable<string | null>[] = [];

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

        // Each result is null on success, or an error message.
        const firstError = results.find(result => result !== null);

        if (firstError) {
          this.actionResult.error(firstError);
        } else {
          this.actionResult.success(
            this.translate.instant('ATTENDANCE.SHEET.SAVE_SUCCESS')
          );
        }

        // Refresh the screen from the backend. Anything that was not
        // saved stays on the screen as an unsaved change.
        this.loadSheet(true);
      });
  }

  // Turns a save request into: null (saved) or an error message.
  // Errors are caught here so one failed request does not cancel the others.
  private toSaveResult(
    request: Observable<ApiResponse<unknown>>
  ): Observable<string | null> {

    return request.pipe(
      map(response =>
        response.success
          ? null
          : this.apiMessageService.getMessage(response)
      ),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to save attendance:', error);

        return of(this.getErrorMessage(error));
      })
    );
  }


  // =========================
  // Summary
  // =========================

  // GET /api/attendance/daily-summary
  private loadSummary(): void {

    this.summaryRequest?.unsubscribe();

    this.summary.set(null);
    this.summaryError.set(null);
    this.summaryLoading.set(true);

    this.summaryRequest = this.attendanceService
      .getDailySummary(this.summaryDate())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.summaryLoading.set(false);

          if (!response.success || !response.data) {
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
          this.summaryError.set(this.getErrorMessage(error));
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

    // Do not replace a sheet that has unsaved changes
    if (this.selectionLocked()) {
      this.activeTab.set('record');

      this.actionResult.error(
        this.translate.instant('ATTENDANCE.SHEET.UNSAVED_BLOCK')
      );
      return;
    }

    this.activeTab.set('record');

    this.date.set(this.summaryDate());
    this.classId.set(section.classId);
    this.sectionId.set(null);
    this.sections.set([]);

    // Clears the old sheet until the section list is loaded
    this.loadSheet();

    this.loadSections(section.classId, section.sectionId);
  }


  // =========================
  // Helpers
  // =========================

  private getErrorMessage(error: HttpErrorResponse): string {

    // 403 has no body, so the backend sends no message for it.
    if (error.status === 403) {
      return this.translate.instant('ATTENDANCE.ERRORS.FORBIDDEN');
    }

    return this.apiMessageService.getErrorMessage(error);
  }

}