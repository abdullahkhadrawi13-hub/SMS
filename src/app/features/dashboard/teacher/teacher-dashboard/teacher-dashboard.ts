import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AttendanceAccessService } from '../../../../core/services/attendance-access';
import { Language } from '../../../../core/services/language';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { pluralKey } from '../../../../shared/utils/plural';

import { TodayAttendanceCard } from '../../shared/today-attendance-card/today-attendance-card';
import { DashboardNumbers } from '../../shared/dashboard-numbers/dashboard-numbers';
import { NoticesCard } from '../../shared/notices-card/notices-card';
import { CurrentTermCard } from '../../shared/current-term-card/current-term-card';
import { TeacherGradesCard } from '../teacher-grades-card/teacher-grades-card';
import {
  DashboardData,
  DashboardNotice,
  DashboardNumber,
  TeacherDashboardData,
} from '../../shared/dashboard.models';
import { groupSectionsByClass, joinNames, sectionName } from '../../shared/dashboard-names';
import {
  DASHBOARD_SAMPLE_DATA,
  TEACHER_DASHBOARD_SAMPLE_DATA,
} from '../../shared/dashboard-sample-data';


// The Teacher dashboard (spec: "SMS — مواصفات تصميم الكحلي والذهبي" → لوحة التحكم):
// main column  = my grades this term, then the numbers strip;
// side column  = needs your attention, then the current term.
//
// The attendance officer (AttendanceAccessService.canRecord, already loaded
// by the layout from GET /api/attendance/my-access) also gets:
//   - the shared "حضور اليوم" card at the top of the main column,
//   - "تسجيل الحضور" as the primary button ("إدخال العلامات" becomes secondary),
//   - the attendance lines first in "يحتاج انتباهك".
//
// TEMPORARY: the numbers come from dashboard-sample-data.ts until the
// backend endpoints are ready. The buttons and links have no action yet.
@Component({
  selector: 'app-teacher-dashboard',
  imports: [
    TranslatePipe,
    MatButtonModule,
    MatIconModule,
    PageHeader,
    TodayAttendanceCard,
    DashboardNumbers,
    NoticesCard,
    CurrentTermCard,
    TeacherGradesCard,
  ],
  templateUrl: './teacher-dashboard.html',
  // The page layout shared by the Teacher, Student and Parent dashboards.
  styleUrl: '../../shared/dashboard-page.css',
})
export class TeacherDashboard {

  private readonly language = inject(Language);
  private readonly attendanceAccess = inject(AttendanceAccessService);

  readonly data: TeacherDashboardData = TEACHER_DASHBOARD_SAMPLE_DATA;

  // Today's attendance and the term: the same sample as the Admin dashboard.
  readonly school: DashboardData = DASHBOARD_SAMPLE_DATA;

  // The teacher is the attendance officer.
  readonly isOfficer = computed(() => this.attendanceAccess.canRecord());

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // ===== The numbers strip =====

  readonly numbers = computed<DashboardNumber[]>(() => {
    const isArabic = this.isArabic();
    const rows = this.data.rows;

    const subjects = [...new Set(rows.map(row => isArabic ? row.subjectNameAr : row.subjectNameEn))];
    const students = rows.reduce((total, row) => total + row.studentCount, 0);
    const assessments = rows.reduce((total, row) => total + row.assessmentCount, 0);

    return [
      {
        labelKey: 'DASHBOARD.TEACHER.NUMBERS.SECTIONS',
        value: rows.length,
        captionKey: pluralKey('DASHBOARD.TEACHER.NUMBERS.IN_CLASSES', this.data.classCount),
        captionParams: { count: this.data.classCount },
      },
      {
        labelKey: 'DASHBOARD.TEACHER.NUMBERS.SUBJECTS',
        value: subjects.length,
        captionText: joinNames(subjects, isArabic),
      },
      {
        labelKey: 'DASHBOARD.TEACHER.NUMBERS.STUDENTS',
        value: students,
        captionKey: 'DASHBOARD.TEACHER.NUMBERS.STUDENTS_CAPTION',
      },
      {
        labelKey: 'DASHBOARD.TEACHER.NUMBERS.ASSESSMENTS',
        value: assessments,
        captionKey: 'DASHBOARD.TEACHER.NUMBERS.ASSESSMENTS_CAPTION',
      },
    ];
  });


  // ===== Needs your attention =====

  readonly notices = computed<DashboardNotice[]>(() => {
    const isArabic = this.isArabic();
    const notices: DashboardNotice[] = [];

    // The attendance officer: sections not started / recorded partly today.
    if (this.isOfficer()) {
      const { notStartedSections, partialSections } = this.school.attention;

      if (notStartedSections.length > 0) {
        notices.push({
          id: 'attendance-not-started',
          tone: 'warn',
          titleKey: pluralKey('DASHBOARD.ATTENTION.NOT_STARTED', notStartedSections.length),
          titleParams: { count: notStartedSections.length },
          parts: [{ text: groupSectionsByClass(notStartedSections, isArabic) }],
          linkKey: 'DASHBOARD.ATTENTION.RECORD_NOW',
        });
      }

      if (partialSections.length > 0) {
        notices.push({
          id: 'attendance-partial',
          tone: 'warn',
          titleKey: pluralKey('DASHBOARD.ATTENTION.PARTIAL', partialSections.length),
          titleParams: { count: partialSections.length },
          parts: partialSections.map(section => ({
            key: 'DASHBOARD.ATTENTION.PARTIAL_LINE',
            params: { name: sectionName(section, isArabic), recorded: section.recordedCount, total: section.studentCount },
          })),
          linkKey: 'DASHBOARD.ATTENTION.COMPLETE',
        });
      }
    }

    // Sections with missing marks (their plan is complete).
    const missing = this.data.rows.filter(row => row.isPlanComplete && row.completeCount < row.studentCount);

    if (missing.length > 0) {
      notices.push({
        id: 'missing-marks',
        tone: 'warn',
        titleKey: pluralKey('DASHBOARD.TEACHER.NOTICES.MISSING', missing.length),
        titleParams: { count: missing.length },
        parts: missing.map(row => {
          const count = row.studentCount - row.completeCount;

          return {
            key: pluralKey('DASHBOARD.TEACHER.NOTICES.MISSING_LINE', count),
            params: {
              name: isArabic ? `${row.classNameAr} ${row.sectionNameAr}` : `${row.classNameEn} ${row.sectionNameEn}`,
              count,
            },
          };
        }),
        linkKey: 'DASHBOARD.ATTENTION.COMPLETE',
      });
    }

    // Plans under 100%: only the administration can complete them.
    const waiting = this.data.rows.filter(row => !row.isPlanComplete);

    if (waiting.length > 0) {
      const names = waiting.map(row => isArabic
        ? `${row.classNameAr} ${row.sectionNameAr} · ${row.subjectNameAr}`
        : `${row.classNameEn} ${row.sectionNameEn} · ${row.subjectNameEn}`);

      notices.push(waiting.length === 1
        ? {
          id: 'plans',
          tone: 'info',
          titleKey: 'DASHBOARD.TEACHER.NOTICES.PLAN_ONE',
          titleParams: { name: names[0] },
          parts: [{ key: 'DASHBOARD.TEACHER.NOTICES.PLAN_LINE' }],
        }
        : {
          id: 'plans',
          tone: 'info',
          titleKey: pluralKey('DASHBOARD.TEACHER.NOTICES.PLANS', waiting.length),
          titleParams: { count: waiting.length },
          parts: [{ text: joinNames(names, isArabic) }, { key: 'DASHBOARD.TEACHER.NOTICES.PLAN_LINE' }],
        });
    }

    return notices;
  });
}
