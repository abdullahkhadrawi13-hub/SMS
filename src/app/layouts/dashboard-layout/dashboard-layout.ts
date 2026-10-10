import { Component, inject, OnInit } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Navbar } from './navbar/navbar';
import { Sidebar } from './sidebar/sidebar';
import { RouterOutlet } from '@angular/router';

import { Language } from '../../core/services/language';
import { AttendanceAccessService } from '../../core/services/attendance-access';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    MatSidenavModule,
    Navbar,
    Sidebar,
    RouterOutlet
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css'
})
export class DashboardLayout implements OnInit {

  languageService = inject(Language);

  private readonly attendanceAccess = inject(AttendanceAccessService);

  ngOnInit(): void {

    // عند فتح التطبيق (Admin / AssistantPrincipal / Teacher):
    // GET /api/attendance/my-access
    // الـ Sidebar يعتمد على النتيجة لإظهار أو إخفاء قسم الحضور والغياب.
    // (للطالب وولي الأمر لا يُرسل أي طلب)
    this.attendanceAccess.load().subscribe();

  }

}