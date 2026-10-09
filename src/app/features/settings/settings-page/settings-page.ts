import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

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

  // The settings page is a list of options.
  // To add a new settings section: add an option here
  // and a route with the same path in settings.routes.ts.
  readonly options: SettingsOption[] = [

    {
      title: 'SETTINGS.OPTIONS.ACADEMIC_YEARS.TITLE',
      description: 'SETTINGS.OPTIONS.ACADEMIC_YEARS.DESCRIPTION',
      icon: 'calendar_month',
      color: 'blue',
      route: 'academic-years'
    },

    {
      title: 'SETTINGS.OPTIONS.ATTENDANCE_OFFICER.TITLE',
      description: 'SETTINGS.OPTIONS.ATTENDANCE_OFFICER.DESCRIPTION',
      icon: 'how_to_reg',
      color: 'orange',
      route: 'attendance-officer'
    }

  ];

}