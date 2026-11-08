import { Component, computed, DestroyRef, inject, signal } from '@angular/core';

import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { TranslatePipe } from '@ngx-translate/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Students } from '../../../../core/services/students';
import { ApiMessageService } from '../../../../core/services/api-message';
import { AttendanceAccessService } from '../../../../core/services/attendance-access';
import { Permissions } from '../../../../core/services/permissions';
import { Language } from '../../../../core/services/language';

import { StudentInfoTab } from '../student-info-tab/student-info-tab';
import { StudentAttendanceTab } from '../student-attendance-tab/student-attendance-tab';
import { StudentParentsTab } from '../student-parents-tab/student-parents-tab';
import { StudentGradesTab } from '../../../grades/student-grades/student-grades-tab/student-grades-tab';

import { Student } from '../../../../core/models/student';

import {
  getStudentAvatarTone,
  getStudentClassName,
  getStudentSectionName
} from '../student-details';
import { getFullName, getInitials } from '../../../../shared/utils/person-name';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StateCard } from '../../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { StudentStatusBadge } from '../../../../shared/components/student-status/student-status';

// The tabs of the page. The active one is in the URL: /students/5?tab=grades
// (no ?tab = the details tab).
export type StudentDetailsTab = 'details' | 'attendance' | 'grades' | 'parents';

// Sent by the students list when it opens this page (router "state"),
// so "Back" can return to the list with the same search, filter and page.
interface StudentDetailsNavigationState {
  fromStudentsList?: boolean;
}

// The student's page: /students/:id
// (it was a dialog opened from the students list).
// The page shows the profile header and the tabs; each tab is its own
// component in this folder, except the grades tab, which lives with
// the other student-grades screens (grades/student-grades).
@Component({
  selector: 'app-student-details-page',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    TranslatePipe,
    StudentInfoTab,
    StudentAttendanceTab,
    StudentParentsTab,
    StudentGradesTab,
    PageHeader,
    StateCard,
    StatusBadge,
    StudentStatusBadge,
  ],
  templateUrl: './student-details-page.html',
  styleUrl: './student-details-page.css'
})
export class StudentDetailsPage {
  private readonly studentsService = inject(Students);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly permissions = inject(Permissions);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // The student id from the URL (/students/:id). 0 = not a valid id.
  readonly studentId = signal(0);

  readonly student = signal<Student | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // false after a 403 (see loadStudent).
  readonly errorRetryable = signal(true);

  // The "Attendance" tab (GET /api/attendance/by-student/{studentId})
  // is for Admin and AssistantPrincipal only. For the other roles
  // the tabs are not shown at all.
  readonly canViewAttendance = this.attendanceAccess.fullAccess;

  readonly activeTab = signal<StudentDetailsTab>('details');

  // The "Parents" tab (GET /api/parents?studentId={studentId}):
  // Admin and AssistantPrincipal only (a teacher gets 403).
  readonly canViewParents = this.permissions.canViewStudentParents;

  // The parents tab is created the first time it is opened,
  // then kept (hidden) while the page is open, so it loads only once.
  readonly parentsTabOpened = signal(false);

  // The "Grades" tab (GET /api/studentgrades/by-student/{studentId}, every term):
  // Admin and AssistantPrincipal only (a teacher gets 403).
  readonly canViewGrades = this.permissions.canViewStudentGrades;

  // Like the parents tab: created the first time it is opened, then kept
  // (hidden) while the page is open, so the grades load only once.
  readonly gradesTabOpened = signal(false);

  // The phone number and the "Account Information" section
  // are for Admin and AssistantPrincipal only (hidden from a teacher).
  // Passed to the details tab (student-info-tab).
  readonly canViewPrivateInfo = this.permissions.canViewStudentPrivateInfo;

  // true = the page was opened from the students list in this visit,
  // so "Back" returns to that list (same search, filter and page).
  private readonly fromStudentsList =
    (this.location.getState() as StudentDetailsNavigationState | null)
      ?.fromStudentsList === true;

  constructor() {

    // /students/:id — also when the id changes while the page stays open.
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('id'));

        this.studentId.set(Number.isInteger(id) && id > 0 ? id : 0);

        // A new student: the tabs load again for them.
        this.parentsTabOpened.set(false);
        this.gradesTabOpened.set(false);

        this.loadStudent();
      });

    // ?tab=... — on open, on refresh and on every tab click.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.showTab(this.toAllowedTab(params.get('tab')));
      });
  }

  loadStudent(): void {
    const studentId = this.studentId();

    if (!studentId) {
      this.student.set(null);
      this.isLoading.set(false);
      this.errorMessage.set('STUDENT_DETAILS.PAGE.INVALID_ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.errorRetryable.set(true);
    this.student.set(null);

    this.studentsService
      .getStudent(studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {

          if (!response.success || !response.data) {

            this.student.set(null);

            this.errorMessage.set(
              this.apiMessageService.getMessage(response) ||
              'STUDENT_DETAILS.PAGE.LOAD_FAILED'
            );

            this.isLoading.set(false);

            return;
          }

          this.student.set(response.data);
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error(
            'Failed to load student:',
            error
          );

          this.student.set(null);

          // 403: a teacher opening a student they do not teach.
          // The backend message says so ("You can only view your own
          // students."), and "Retry" is hidden: it would get 403 again.
          const retryable = this.apiMessageService.canRetry(error);

          this.errorMessage.set(
            retryable
              ? 'STUDENT_DETAILS.PAGE.LOAD_FAILED'
              : this.apiMessageService.getErrorMessage(error)
          );
          this.errorRetryable.set(retryable);

          this.isLoading.set(false);
        }
      });
  }

  // The page header: name, initials, avatar colour, class and section,
  // in the language of the page (updates when the language changes).
  readonly header = computed(() => {
    const student = this.student();

    if (!student) {
      return null;
    }

    const isArabic = this.language.currentDirection() === 'rtl';

    return {
      name: getFullName(student, isArabic),
      initials: getInitials(student, isArabic),
      avatarTone: getStudentAvatarTone(student),
      className: getStudentClassName(student, isArabic),
      sectionName: getStudentSectionName(student, isArabic),
    };
  });

  // True when the user sees more than the details tab.
  hasTabs(): boolean {
    return this.canViewAttendance() || this.canViewGrades() || this.canViewParents();
  }

  // A tab click: only the URL changes (?tab=...);
  // the queryParamMap subscription above shows the tab.
  openTab(tab: StudentDetailsTab): void {
    if (tab === this.activeTab()) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'details' ? null : tab },
      queryParamsHandling: 'merge',
      // Replace: a tab is not a new step for the browser's "Back".
      replaceUrl: true,
      // Keep "Back" returning to the list after a tab click.
      state: { fromStudentsList: this.fromStudentsList }
    });
  }

  // "Back to Students": the list as it was (same search, filter and page)
  // when the page was opened from it, otherwise the plain list
  // (a link from elsewhere, or the address typed by hand).
  goBack(event: MouseEvent): void {
    // Ctrl / Cmd / Shift / middle click: let the browser open /students.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (this.fromStudentsList) {
      this.location.back();
    } else {
      this.router.navigate(['/students']);
    }
  }

  retry(): void {
    this.loadStudent();
  }

  // The tab from the URL, or "details" when it is unknown
  // or the user may not see it (e.g. a teacher with ?tab=grades).
  private toAllowedTab(value: string | null): StudentDetailsTab {
    switch (value) {
      case 'attendance':
        return this.canViewAttendance() ? 'attendance' : 'details';
      case 'grades':
        return this.canViewGrades() ? 'grades' : 'details';
      case 'parents':
        return this.canViewParents() ? 'parents' : 'details';
      default:
        return 'details';
    }
  }

  private showTab(tab: StudentDetailsTab): void {
    if (tab === 'parents') {
      this.parentsTabOpened.set(true);
    }

    if (tab === 'grades') {
      this.gradesTabOpened.set(true);
    }

    this.activeTab.set(tab);
  }
}
