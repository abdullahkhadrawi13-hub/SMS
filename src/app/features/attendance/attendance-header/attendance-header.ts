import { Component } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-attendance-header',
  imports: [
    TranslatePipe
  ],
  templateUrl: './attendance-header.html',
  styleUrl: './attendance-header.css',
})
export class AttendanceHeader {}
