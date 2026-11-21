import {
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import {
  AttendanceRecord,
  AttendanceTermSummary,
} from '../../../../core/models/attendance';
import { StudentDashboardCard } from '../../../../core/models/dashboard';
import { DEFAULT_WEEKLY_DAYS_OFF } from '../../../../core/models/school-settings';
import { StudentStatus } from '../../../../core/models/student';
import { ApiResponse } from '../../../../core/models/api-response';
import { ApiMessageService } from '../../../../core/services/api-message';
import { AttendanceService } from '../../../../core/services/attendance';
import { DashboardService } from '../../../../core/services/dashboard';
import { Language } from '../../../../core/services/language';
import { SchoolSettingsService } from '../../../../core/services/school-settings';
import {
  ChildPicker,
  ChildPickerCard,
} from '../../../../shared/components/child-picker/child-picker';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StateCard } from '../../../../shared/components/state-card/state-card';
import { getAvatarTone, getInitialsFromFullName } from '../../../../shared/utils/person-name';

import { TermAttendance } from '../term-attendance/term-attendance';
import { AttendanceTermSelect } from '../term-select/term-select';
import {
  getChildStatusMessage,
  getDefaultTermId,
  getTermLabelParams,
  getTermOptions,
  loadWeeklyDaysOff,
} from '../student-attendance';


// One child's attendance, once loaded.
interface ChildAttendance {
  records: AttendanceRecord[];
  summaries: AttendanceTermSummary[];
}


// The parent's Attendance page («حضور أبنائي»). Route: /attendance (Parent).
//
//   1. GET /api/dashboard/parent/me → the children (one card each, with
//      their class) and the current term (also before any day is recorded).
//   2. Picking a child → GET /api/attendance/by-student/{id} and
//      GET /api/attendance/summary/by-student/{id}, together. Each child is
//      loaded once while the page is open.
//   3. GET /api/schoolsettings/school for the weekly days off (never an error).
//
// The picked child is kept in ?child=<studentId> (also the link from the
// Parent dashboard), so a refresh keeps it.
// A child who is not active (withdrawn, graduated, transferred) has no
// record in the current term: a message, with a button that loads the
// earlier terms («عرض حضوره في الفصول السابقة»).
@Component({
  selector: 'app-children-attendance',
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
    StateCard,
    ChildPicker,
    TermAttendance,
    AttendanceTermSelect,
  ],
  templateUrl: './children-attendance.html',
  styleUrl: './children-attendance.css',
})
export class ChildrenAttendance implements OnInit {

  private readonly dashboardService = inject(DashboardService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly schoolSettingsService = inject(SchoolSettingsService);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly language = inject(Language);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);


  // ===== Children (GET /api/dashboard/parent/me) =====

  readonly children = signal<StudentDashboardCard[]>([]);
  readonly childrenLoading = signal(false);
  readonly childrenError = signal('');

  readonly selectedId = signal<number | null>(null);


  // ===== Attendance of the selected child =====

  // By studentId. A child that is not here has not been loaded yet.
  private readonly attendance = signal<Record<number, ChildAttendance>>({});

  // The children who are not active and whose earlier terms were asked for.
  private readonly pastOpened = signal<ReadonlySet<number>>(new Set());

  readonly attendanceLoading = signal(false);
  readonly attendanceError = signal('');

  // false after a 403: the error card shows no "Retry".
  readonly attendanceRetryable = signal(true);

  readonly weeklyDaysOff = signal<readonly number[]>(DEFAULT_WEEKLY_DAYS_OFF);

  // The request of the child being loaded (cancelled when another is picked).
  private attendanceRequest: Subscription | null = null;


  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );

  readonly cards = computed<ChildPickerCard[]>(() => {

    const isArabic = this.isArabic();

    return this.children().map(child => {

      const name = isArabic
        ? child.studentNameAr || child.studentNameEn
        : child.studentNameEn || child.studentNameAr;

      return {
        studentId: child.studentId,
        name,
        initials: getInitialsFromFullName(name),
        avatarTone: getAvatarTone(child.studentId),
        classSection: this.getClassSection(child, isArabic),
        status: child.studentStatus,
      };
    });
  });

  readonly hasManyChildren = computed(() => this.children().length > 1);

  readonly selectedChild = computed(() =>
    this.children().find(c => c.studentId === this.selectedId()) ?? null
  );

  readonly selectedCard = computed(() =>
    this.cards().find(c => c.studentId === this.selectedId()) ?? null
  );

  readonly isSelectedActive = computed(
    () => this.selectedChild()?.studentStatus === StudentStatus.Active
  );

  // A child who is not active, before "earlier terms" was pressed:
  // the message shown instead of the attendance.
  readonly statusMessage = computed(() => {

    const child = this.selectedChild();

    if (!child || this.isSelectedActive() || this.pastOpened().has(child.studentId)) {
      return null;
    }

    return getChildStatusMessage(child.studentStatus);
  });

  // undefined = not loaded yet.
  readonly selectedAttendance = computed<ChildAttendance | undefined>(() => {
    const id = this.selectedId();
    return id !== null ? this.attendance()[id] : undefined;
  });

  // The current term from the dashboard (the same for every child).
  private readonly currentTerm = computed(
    () => this.children().find(c => c.currentTerm)?.currentTerm ?? null
  );

  readonly currentTermLabel = computed(() => {
    const term = this.currentTerm();
    return term ? getTermLabelParams(term, this.isArabic()) : null;
  });

  // The selected child's terms. An active child also gets the current term
  // when it has no record yet; a child who is not active only has the
  // terms with records (earlier terms).
  readonly termOptions = computed(() => {

    const data = this.selectedAttendance();

    if (!data) {
      return [];
    }

    return getTermOptions(
      data.summaries,
      this.isSelectedActive() ? this.currentTerm() : null
    );
  });

  // Starts again (the current term, or the newest) with every other child.
  readonly termId = linkedSignal(() => getDefaultTermId(this.termOptions()));

  readonly term = computed(() =>
    this.termOptions().find(t => t.academicTermId === this.termId()) ?? null
  );


  ngOnInit(): void {

    this.loadChildren();

    loadWeeklyDaysOff(this.schoolSettingsService)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(days => this.weeklyDaysOff.set(days));
  }


  // GET /api/dashboard/parent/me
  loadChildren(): void {

    this.childrenLoading.set(true);
    this.childrenError.set('');

    this.dashboardService
      .getParentMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.childrenLoading.set(false);

          if (!response.success || !response.data) {
            this.children.set([]);
            this.childrenError.set(this.apiMessageService.getMessage(response));
            return;
          }

          const children = response.data.children ?? [];

          this.children.set(children);

          // The child in ?child=, else the first active child
          // (the API sends the active children first), else the first.
          const wanted = Number(this.route.snapshot.queryParamMap.get('child'));

          const first =
            children.find(c => c.studentId === wanted)
            ?? children.find(c => c.studentStatus === StudentStatus.Active)
            ?? children[0];

          if (first) {
            this.select(first.studentId, false);
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the children:', error);

          this.childrenLoading.set(false);
          this.children.set([]);
          this.childrenError.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }


  // Picks a child (and keeps it in ?child=). The attendance is loaded for
  // an active child, or a child whose earlier terms were asked for, once.
  select(studentId: number, updateUrl = true): void {

    this.selectedId.set(studentId);

    this.cancelAttendanceRequest();
    this.attendanceError.set('');

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { child: studentId },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    if (this.statusMessage() === null && !(studentId in this.attendance())) {
      this.loadAttendance(studentId);
    }
  }

  // «عرض حضوره في الفصول السابقة» (a child who is not active).
  showPastTerms(): void {

    const id = this.selectedId();

    if (id === null) {
      return;
    }

    this.pastOpened.update(set => new Set(set).add(id));

    if (!(id in this.attendance())) {
      this.loadAttendance(id);
    }
  }


  // GET /api/attendance/by-student/{id} + GET /api/attendance/summary/by-student/{id}
  loadAttendance(studentId: number): void {

    this.cancelAttendanceRequest();

    this.attendanceLoading.set(true);
    this.attendanceError.set('');
    this.attendanceRetryable.set(true);

    this.attendanceRequest = forkJoin({
      records: this.attendanceService.getStudentAttendance(studentId),
      summary: this.attendanceService.getStudentSummary(studentId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ records, summary }) => {

          this.attendanceLoading.set(false);

          const failed = ([records, summary] as ApiResponse<unknown>[]).find(r => !r.success);

          if (failed) {
            this.attendanceError.set(this.apiMessageService.getMessage(failed));
            return;
          }

          this.attendance.update(all => ({
            ...all,
            [studentId]: {
              records: records.data ?? [],
              summaries: summary.data?.terms ?? [],
            },
          }));
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the child\'s attendance:', error);

          this.attendanceLoading.set(false);

          // 403: not one of this parent's children, or a student id that
          // does not exist (one answer for both). The message says so,
          // no "Retry".
          this.attendanceError.set(this.apiMessageService.getErrorMessage(error));
          this.attendanceRetryable.set(this.apiMessageService.canRetry(error));
        },
      });
  }

  retryAttendance(): void {

    const id = this.selectedId();

    if (id !== null) {
      this.loadAttendance(id);
    }
  }


  private cancelAttendanceRequest(): void {
    this.attendanceRequest?.unsubscribe();
    this.attendanceRequest = null;
    this.attendanceLoading.set(false);
  }

  private getClassSection(
    child: StudentDashboardCard,
    isArabic: boolean
  ): { class: string; section: string } {

    return {
      class: isArabic ? child.classNameAr || child.classNameEn : child.classNameEn || child.classNameAr,
      section: isArabic ? child.sectionAr || child.sectionEn : child.sectionEn || child.sectionAr,
    };
  }
}
