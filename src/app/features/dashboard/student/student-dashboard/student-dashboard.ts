import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';

import { Language } from '../../../../core/services/language';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { formatLongDate } from '../../../settings/academic-years/academic-years';

import { DashboardNumbers } from '../../shared/dashboard-numbers/dashboard-numbers';
import { CurrentTermCard } from '../../shared/current-term-card/current-term-card';
import { StudentGradesCard } from '../student-grades-card/student-grades-card';
import { StudentInfoCard } from '../student-info-card/student-info-card';
import {
  DashboardNumber,
  DashboardTerm,
  StudentDashboardData,
} from '../../shared/dashboard.models';
import { joinNames } from '../../shared/dashboard-names';
import {
  DASHBOARD_SAMPLE_DATA,
  STUDENT_DASHBOARD_SAMPLE_DATA,
} from '../../shared/dashboard-sample-data';


// The Student dashboard (spec: "SMS — مواصفات تصميم الكحلي والذهبي" → لوحة التحكم):
// main column  = my grades this term, then the numbers strip;
// side column  = my information, then the current term.
// No button in the header: the student has nothing to record.
//
// TEMPORARY: the numbers come from dashboard-sample-data.ts until the
// backend endpoints are ready (the days absent wait for a student
// attendance endpoint). The links have no action yet.
@Component({
  selector: 'app-student-dashboard',
  imports: [
    TranslatePipe,
    MatIconModule,
    PageHeader,
    DashboardNumbers,
    CurrentTermCard,
    StudentGradesCard,
    StudentInfoCard,
  ],
  templateUrl: './student-dashboard.html',
  // The page layout shared by the Teacher, Student and Parent dashboards.
  styleUrl: '../../shared/dashboard-page.css',
})
export class StudentDashboard {

  private readonly language = inject(Language);

  readonly data: StudentDashboardData = STUDENT_DASHBOARD_SAMPLE_DATA;
  readonly term: DashboardTerm = DASHBOARD_SAMPLE_DATA.term;

  readonly numbers = computed<DashboardNumber[]>(() => {
    const isArabic = this.language.currentDirection() === 'rtl';
    const subjects = this.data.subjects;

    const passed = subjects.filter(subject => subject.result === 'passed').length;
    const failed = subjects.filter(subject => subject.result === 'failed');
    const lastAbsent = this.data.lastAbsentDate;

    const failedNumber: DashboardNumber = failed.length > 0
      ? {
        labelKey: 'DASHBOARD.STUDENT.NUMBERS.FAILED',
        value: failed.length,
        isBad: true,
        captionText: joinNames(failed.map(subject => isArabic ? subject.nameAr : subject.nameEn), isArabic),
      }
      : {
        labelKey: 'DASHBOARD.STUDENT.NUMBERS.FAILED',
        value: 0,
        captionKey: 'DASHBOARD.STUDENT.NUMBERS.FAILED_NONE',
      };

    const absentNumber: DashboardNumber = lastAbsent
      ? {
        labelKey: 'DASHBOARD.STUDENT.NUMBERS.ABSENT',
        value: this.data.absentDays,
        captionKey: 'DASHBOARD.STUDENT.NUMBERS.ABSENT_LAST',
        captionParams: { date: formatLongDate(lastAbsent, isArabic) },
      }
      : {
        labelKey: 'DASHBOARD.STUDENT.NUMBERS.ABSENT',
        value: this.data.absentDays,
        captionKey: 'DASHBOARD.STUDENT.NUMBERS.ABSENT_NONE',
      };

    return [
      {
        labelKey: 'DASHBOARD.STUDENT.NUMBERS.SUBJECTS',
        value: subjects.length,
        captionKey: 'DASHBOARD.STUDENT.NUMBERS.SUBJECTS_CAPTION',
        captionParams: { term: isArabic ? this.term.nameAr : this.term.nameEn },
      },
      {
        labelKey: 'DASHBOARD.STUDENT.NUMBERS.PASSED',
        value: passed,
        captionKey: 'DASHBOARD.STUDENT.NUMBERS.PASSED_CAPTION',
      },
      failedNumber,
      absentNumber,
    ];
  });
}
