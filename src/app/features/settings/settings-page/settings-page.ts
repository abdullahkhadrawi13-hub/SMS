import { Component, Signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { Permissions } from '../../../core/services/permissions';

// Colors available for the icon of an option.
// Each color is defined in settings-page.css (.color-...).
type SettingsOptionColor = 'blue' | 'green' | 'orange' | 'purple' | 'red';

// One option of the settings list.
// Each option opens a sub-route of /settings.
interface SettingsOption {
  title: string;
  description: string;
  icon: string;
  color: SettingsOptionColor;
  route: string;

  // Who sees the option (from the Permissions service).
  visible: Signal<boolean>;
}

@Component({
  selector: 'app-settings-page',
  imports: [
    RouterLink,

    MatIconModule,
    TranslatePipe
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
      title: 'SETTINGS.OPTIONS.ACADEMIC_YEARS.TITLE',
      description: 'SETTINGS.OPTIONS.ACADEMIC_YEARS.DESCRIPTION',
      icon: 'calendar_month',
      color: 'blue',
      route: 'academic-years',
      visible: this.permissions.canViewAcademicYears
    },

    {
      title: 'SETTINGS.OPTIONS.ATTENDANCE_OFFICER.TITLE',
      description: 'SETTINGS.OPTIONS.ATTENDANCE_OFFICER.DESCRIPTION',
      icon: 'how_to_reg',
      color: 'orange',
      route: 'attendance-officer',
      visible: this.permissions.canManageAttendanceOfficer
    }

  ];

  // Only the options the current user may open
  // (the AssistantPrincipal sees the academic years only).
  readonly options = computed(() =>
    this.allOptions.filter(option => option.visible())
  );

}
