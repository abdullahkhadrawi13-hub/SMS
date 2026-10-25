import { Component, DestroyRef, inject, signal } from '@angular/core';

import { CommonModule, Location } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';

import { TranslatePipe } from '@ngx-translate/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Students } from '../../../core/services/students';
import { ApiMessageService } from '../../../core/services/api-message';
import { AttendanceAccessService } from '../../../core/services/attendance-access';
import { Permissions } from '../../../core/services/permissions';
import { getRoleTranslationKey } from '../../../core/models/user-role';

import { AttendanceHistory } from '../../attendance/attendance-history/attendance-history';
import { StudentParents } from '../student-parents/student-parents';
import { StudentGradesTab } from '../../grades/student-grades/student-grades-tab/student-grades-tab';

import { Student, StudentStatus } from '../../../core/models/student';

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
@Component({
  selector: 'app-student-details',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    TranslatePipe,
    AttendanceHistory,
    StudentParents,
    StudentGradesTab
  ],
  templateUrl: './students-details.html',
  styleUrl: './students-details.css'
})
export class StudentsDetails {
  private readonly studentsService = inject(Students);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly attendanceAccess = inject(AttendanceAccessService);
  private readonly permissions = inject(Permissions);
  private readonly destroyRef = inject(DestroyRef);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // The student id from the URL (/students/:id). 0 = not a valid id.
  readonly studentId = signal(0);

  readonly student = signal<Student | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

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
      this.errorMessage.set('STUDENTS_DETAILS.INVALID_ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
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
              'STUDENTS_DETAILS.LOAD_FAILED'
            );

            this.isLoading.set(false);

            return;
          }

          this.student.set(response.data);
          this.isLoading.set(false);
        },

        error: error => {

          console.error(
            'Failed to load student:',
            error
          );

          this.student.set(null);

          this.errorMessage.set(
            'STUDENTS_DETAILS.LOAD_FAILED'
          );

          this.isLoading.set(false);
        }
      });
  }

  // The name in the language of the page (used in the profile header).
  getStudentName(student: Student): string {
    return document.documentElement.lang === 'ar'
      ? this.getStudentNameAr(student) || this.getStudentNameEn(student)
      : this.getStudentNameEn(student) || this.getStudentNameAr(student);
  }

  getStudentNameAr(student: Student): string {
    return [
      student.firstNameAr,
      student.fatherNameAr,
      student.grandFatherNameAr,
      student.familyNameAr
    ]
      .filter(Boolean)
      .join(' ');
  }

  getStudentNameEn(student: Student): string {
    return [
      student.firstNameEn,
      student.fatherNameEn,
      student.grandFatherNameEn,
      student.familyNameEn
    ]
      .filter(Boolean)
      .join(' ');
  }

  // The first letter of the first name and of the family name,
  // in the language of the page (the avatar of the profile header).
  // A zero-width non-joiner (‌) keeps two Arabic letters
  // apart, so they do not join into one word.
  getInitials(student: Student): string {
    const isArabic = document.documentElement.lang === 'ar';

    const first = isArabic
      ? student.firstNameAr || student.firstNameEn
      : student.firstNameEn || student.firstNameAr;

    const family = isArabic
      ? student.familyNameAr || student.familyNameEn
      : student.familyNameEn || student.familyNameAr;

    return [first, family]
      .map(name => name?.trim().charAt(0) ?? '')
      .filter(Boolean)
      .join('‌')
      .toUpperCase();
  }

  // The class name comes with the student (classNameAr / classNameEn).
  // Falls back to the id if the names are missing.
  getClassName(student: Student): string {
    const name = document.documentElement.lang === 'ar'
      ? student.classNameAr || student.classNameEn
      : student.classNameEn || student.classNameAr;

    return name || String(student.classId ?? '-');
  }

  // The section name comes with the student (sectionAr / sectionEn).
  // Falls back to the id if the names are missing.
  getSectionName(student: Student): string {
    const name = document.documentElement.lang === 'ar'
      ? student.sectionAr || student.sectionEn
      : student.sectionEn || student.sectionAr;

    return name || String(student.sectionId ?? '-');
  }

  // studentStatus = Graduated: the gold "Graduated" badge
  // next to the account status (the same as the students table).
  isGraduated(student: Student): boolean {
    return student.studentStatus === StudentStatus.Graduated;
  }

  // The shared function from user-role.ts, kept here under the same
  // name so the template can call it.
  readonly getRoleTranslationKey = getRoleTranslationKey;

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
