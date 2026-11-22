import { Component, Signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { Permissions } from '../../../core/services/permissions';
import { PageHeader } from '../../../shared/components/page-header/page-header';

// One option of the settings list.
// Each option opens a sub-route of /settings.
interface SettingsOption {
  title: string;
  description: string;
  icon: string;
  route: string;

  // Who sees the option (from the Permissions service).
  visible: Signal<boolean>;

  // True when the user can open the option but not change anything
  // (the AssistantPrincipal on the academic years): a "View only" badge.
  readOnly?: Signal<boolean>;
}

@Component({
  selector: 'app-settings-page',
  imports: [
    RouterLink,

    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {

  private readonly permissions = inject(Permissions);

  // The settings page is a list of options.
  // To add a new settings section: add an option here
  // and a route with the same path in settings.routes.ts.
  private readonly allOptions: SettingsOption[] = [

    {
      title: 'SETTINGS.OPTIONS.SCHOOL_INFO.TITLE',
      description: 'SETTINGS.OPTIONS.SCHOOL_INFO.DESCRIPTION',
      icon: 'apartment',
      route: 'school',
      visible: this.permissions.canViewSchoolInfo,
      readOnly: computed(() => !this.permissions.canManageSchoolInfo())
    },

    {
      title: 'SETTINGS.OPTIONS.ACADEMIC_YEARS.TITLE',
      description: 'SETTINGS.OPTIONS.ACADEMIC_YEARS.DESCRIPTION',
      icon: 'calendar_month',
      route: 'academic-years',
      visible: this.permissions.canViewAcademicYears,
      readOnly: computed(() => !this.permissions.canManageAcademicYears())
    },

    {
      title: 'SETTINGS.OPTIONS.ATTENDANCE_OFFICER.TITLE',
      description: 'SETTINGS.OPTIONS.ATTENDANCE_OFFICER.DESCRIPTION',
      icon: 'how_to_reg',
      route: 'attendance-officer',
      visible: this.permissions.canManageAttendanceOfficer
    },

    {
      title: 'SETTINGS.OPTIONS.ROLLOVER.TITLE',
      description: 'SETTINGS.OPTIONS.ROLLOVER.DESCRIPTION',
      icon: 'move_up',
      route: 'rollover',
      visible: this.permissions.canManageRollover
    }

  ];

  // Only the options the current user may open
  // (the AssistantPrincipal sees the academic years only).
  readonly options = computed(() =>
    this.allOptions.filter(option => option.visible())
  );

}
