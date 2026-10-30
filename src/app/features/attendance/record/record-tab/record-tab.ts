import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, map, Observable, of, Subscription } from 'rxjs';

import { RecordSelector } from '../record-selector/record-selector';
import { RecordSheet } from '../record-sheet/record-sheet';

import {
  AttendanceDraft,
  AttendanceSheetStats,
  AttendanceSheetTarget,
  AttendanceStatusChange,
  todayApiDate
} from '../../shared/attendance-shared';

import { ApiResponse } from '../../../../core/models/api-response';
import { ApiMessageService } from '../../../../core/services/api-message';
import { AttendanceService } from '../../../../core/services/attendance';
import { AttendanceAccessService } from '../../../../core/services/attendance-access';
import { Language } from '../../../../core/services/language';
import { SchoolClassesService } from '../../../../core/services/school-classes';
import { SectionsService } from '../../../../core/services/sections';
import { ActionResult } from '../../../../shared/services/action-result';
import { SchoolClassSimpleDto } from '../../../../core/models/school-class';
import { ActiveSectionDto } from '../../../../core/models/section';
import {
  ATTENDANCE_PRESENT,
  AttendanceEntry,
  AttendanceSheet as AttendanceSheetData
} from '../../../../core/models/attendance';

// The result of one save request (one POST or one PUT).
// The message always comes from the backend (Arabic or English).
interface AttendanceSaveResult {
  success: boolean;
  message: string;
}

// The "Record attendance" tab of the attendance page:
// pick a class, a section and a date (record-selector), then mark each
// student present or absent and save (record-sheet).
// This component owns all the data of the tab and talks to the API;
// the two children only show it.
@Component({
  selector: 'app-record-tab',
  imports: [
    RecordSelector,
    RecordSheet
  ],
  templateUrl: './record-tab.html',
  styleUrl: './record-tab.css',
})
export class RecordTab implements OnInit {

  private readonly attendanceService = inject(AttendanceService);
  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly classesService = inject(SchoolClassesService);
  private readonly sectionsService = inject(SectionsService);

  private readonly apiMessageService = inject(ApiMessageService);
  private readonly actionResult = inject(ActionResult);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(Language);

  private readonly destroyRef = inject(DestroyRef);

  // Today in the API format (YYYY-MM-DD). Future dates are not allowed.
  readonly today = todayApiDate();

  // The attendance officer records today only: the date is locked.
  // (my-access is already loaded: attendanceAccessGuard waits for it.)
  readonly todayOnly = this.attendanceAccess.todayOnly;

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // =========================
  // Selection
  // =========================

  readonly classes = signal<SchoolClassSimpleDto[]>([]);
  readonly sections = signal<ActiveSectionDto[]>([]);
  readonly sectionsLoading = signal(false);

  readonly classId = signal<number | null>(null);
  readonly sectionId = signal<number | null>(null);
  readonly date = signal(this.today);


  // =========================
  // Sheet
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


  // Running requests. A new request cancels the previous one,
  // so an old response never replaces a newer selection.
  private sectionsRequest?: Subscription;
  private sheetRequest?: Subscription;


  ngOnInit(): void {
    this.loadClasses();
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
  // (used when a section is opened from the summary or absentees tab).
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
  // Open a sheet from another tab
  // =========================

  // Called by the page when the daily summary or the absentees tab asks
  // to open the sheet of a section on a date (the page has already
  // switched to this tab).
  openSheet(target: AttendanceSheetTarget): void {

    // Do not replace a sheet that has unsaved changes
    if (this.selectionLocked()) {
      this.actionResult.show(
        'warning',
        this.translate.instant('ATTENDANCE.RECORD_SHEET.UNSAVED_BLOCK')
      );
      return;
    }

    this.date.set(target.date);
    this.classId.set(target.classId);
    this.sectionId.set(null);
    this.sections.set([]);

    // Clears the old sheet until the section list is loaded
    this.loadSheet();

    this.loadSections(target.classId, target.sectionId);
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
            || this.translate.instant('ATTENDANCE.RECORD_SHEET.SAVE_SUCCESS')
          );

        } else {

          // Several requests: there is no single backend message for all
          // of them, so one general message is shown.
          this.actionResult.show(
            'success',
            this.translate.instant('ATTENDANCE.RECORD_SHEET.SAVE_SUCCESS')
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

}
