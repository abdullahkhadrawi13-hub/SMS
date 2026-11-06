import { Component } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-attendance-header',
  imports: [
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './attendance-header.html',
  styleUrl: './attendance-header.css',
})
export class AttendanceHeader {}
