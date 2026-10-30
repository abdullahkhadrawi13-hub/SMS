import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { Subscription } from 'rxjs';

import { AbsenteesList } from '../absentees-list/absentees-list';

import { ApiMessageService } from '../../../../core/services/api-message';
import { AttendanceService } from '../../../../core/services/attendance';
import { AttendanceAccessService } from '../../../../core/services/attendance-access';
import { Permissions } from '../../../../core/services/permissions';
import { AttendanceAbsentees } from '../../../../core/models/attendance';
import {
  AbsenteeSection,
  AttendanceSheetTarget,
  todayApiDate
} from '../../shared/attendance-shared';

// The "Absentees" tab of the attendance page (GET /api/attendance/absentees):
// the students marked absent on a day, with their parents' phone numbers.
// This component loads the data and keeps the date, the search and the
// selected section; absentees-list only shows them.
@Component({
  selector: 'app-absentees-tab',
  imports: [
    AbsenteesList
  ],
  templateUrl: './absentees-tab.html',
  styleUrl: './absentees-tab.css',
})
export class AbsenteesTab {

  private readonly attendanceService = inject(AttendanceService);
  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly permissions = inject(Permissions);
  private readonly destroyRef = inject(DestroyRef);

  // ===== Inputs =====

  // Goes up by one every time the page opens this tab (or the tab is
  // clicked again): the tab then loads a fresh list, because attendance
  // may have been changed in the record tab.
  readonly reloadKey = input(0);

  // ===== Outputs =====

  // The user wants to open the sheet of a section on the selected day
  // (the page moves to the record tab).
  readonly openSheet = output<AttendanceSheetTarget>();

  // ===== Access =====

  // Admin and AssistantPrincipal any day, the attendance officer today only.
  readonly todayOnly = this.attendanceAccess.todayOnly;

  // Admin and AssistantPrincipal: a student's name opens the student page.
  readonly canOpenStudent = this.attendanceAccess.fullAccess;

  // Admin only: "Link a parent" for a student with no parent.
  readonly canLinkParent = this.permissions.canManageParents;

  // ===== State =====

  // Dates use the API format: YYYY-MM-DD. Future dates are not allowed.
  readonly maxDate = todayApiDate();
  readonly date = signal(this.maxDate);

  // The answer of the API (null = nothing loaded).
  readonly absentees = signal<AttendanceAbsentees | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // The search and the selected section stay when the user changes the
  // date or the tab. The selected section stays selected even on a date
  // with no absent students in it (the list then says so).
  readonly search = signal('');
  readonly section = signal<AbsenteeSection | null>(null);

  // The running request. A new request cancels the previous one,
  // so an old response never replaces a newer date.
  private absenteesRequest?: Subscription;


  constructor() {

    // Load every time the page opens the tab (0 = not opened yet).
    // untracked: only reloadKey starts a load, not the signals read inside it.
    effect(() => {
      if (this.reloadKey() > 0) {
        untracked(() => this.loadAbsentees());
      }
    });
  }


  // GET /api/attendance/absentees
  private loadAbsentees(): void {

    this.absenteesRequest?.unsubscribe();

    // The old list stays on the screen while the new one loads
    // (absentees-list shows a thin progress bar on top of it).
    this.errorMessage.set(null);
    this.loading.set(true);

    this.absenteesRequest = this.attendanceService
      .getAbsentees(this.date())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.loading.set(false);

          if (!response.success || !response.data) {
            this.absentees.set(null);
            this.errorMessage.set(
              this.apiMessageService.getMessage(response)
            );
            return;
          }

          this.absentees.set(response.data);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load absent students:', error);

          this.loading.set(false);
          this.absentees.set(null);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        }
      });
  }

  onDateChange(date: string): void {

    // The attendance officer cannot leave today
    if (this.todayOnly()) {
      return;
    }

    this.date.set(date);
    this.loadAbsentees();
  }

  // Opens the sheet of this section (on the selected day) in the record tab.
  openSectionSheet(section: AbsenteeSection): void {
    this.openSheet.emit({
      classId: section.classId,
      sectionId: section.sectionId,
      date: this.date()
    });
  }

}
