import { computed, inject, Injectable } from '@angular/core';

import { UserRole } from '../models/user-role';
import { User } from './user';

// What the current user is allowed to do, in one place for the whole app.
//
// The pages ask this service instead of comparing the role themselves:
//   readonly canManage = this.permissions.canManageStudents;
// and pass the answer to their child components as an input:
//   <app-students-header [canManage]="canManage()" />
//
// The rules follow the SMS API Reference (section 2, roles matrix).
// When the backend changes a rule, only this file changes.
//
// Note: this only hides buttons in the pages.
// The real protection is in the backend (it answers 403).
@Injectable({
  providedIn: 'root',
})
export class Permissions {

  private readonly user = inject(User);

  // The role of the current user (null when nobody is logged in).
  private readonly role = computed(
    () => this.user.user()?.role ?? null
  );


  // ===== Roles =====

  readonly isAdmin = computed(
    () => this.role() === UserRole.Admin
  );

  readonly isAssistantPrincipal = computed(
    () => this.role() === UserRole.AssistantPrincipal
  );

  readonly isTeacher = computed(
    () => this.role() === UserRole.Teacher
  );


  // ===== Students (API Reference, section 4) =====

  // Add, edit, activate and deactivate students: Admin only.
  // AssistantPrincipal reads every student, a teacher reads their own students.
  readonly canManageStudents = computed(
    () => this.isAdmin()
  );

  // The student's phone number and account information
  // (login id, role, password status): Admin and AssistantPrincipal only.
  // A teacher sees the student's name, number, class and section.
  // The rule names who is allowed (not who is blocked), so a new role
  // (e.g. Parent) does not see this information until it is added here.
  readonly canViewStudentPrivateInfo = computed(
    () => this.isAdmin() || this.isAssistantPrincipal()
  );


  // ===== Teachers (API Reference, section 5) =====

  // Add, edit, activate and deactivate teachers: Admin only.
  // AssistantPrincipal can only read.
  readonly canManageTeachers = computed(
    () => this.isAdmin()
  );


  // ===== Parents (API Reference, section 14) =====

  // Add and edit parents, activate / deactivate them,
  // link and unlink their children: Admin only.
  // AssistantPrincipal can only read. A teacher gets 403.
  readonly canManageParents = computed(
    () => this.isAdmin()
  );

  // The "Parents" tab in the student details (GET /api/parents?studentId=):
  // Admin and AssistantPrincipal. A teacher gets 403 on this list,
  // so the tab is not shown to them.
  readonly canViewStudentParents = computed(
    () => this.isAdmin() || this.isAssistantPrincipal()
  );


  // ===== Subjects (API Reference, section 6) =====

  // Add, edit, activate and deactivate subjects: Admin only.
  // AssistantPrincipal can only read.
  readonly canManageSubjects = computed(
    () => this.isAdmin()
  );


  // ===== Classes and sections (API Reference, section 7) =====

  // Add, edit, activate and deactivate classes: Admin only.
  // AssistantPrincipal can only read.
  readonly canManageClasses = computed(
    () => this.isAdmin()
  );

  // Add, edit, activate and deactivate sections: Admin only.
  // AssistantPrincipal can only read.
  readonly canManageSections = computed(
    () => this.isAdmin()
  );


  // ===== Academic years and terms (API Reference, section 7) =====

  // Read the years and terms (Settings → Academic years):
  // Admin and AssistantPrincipal. A teacher gets 403.
  readonly canViewAcademicYears = computed(
    () => this.isAdmin() || this.isAssistantPrincipal()
  );

  // Add / edit years and terms, activate / deactivate a term
  // and set the current term: Admin only.
  readonly canManageAcademicYears = computed(
    () => this.isAdmin()
  );


  // ===== Grades (API Reference, section 10) =====

  // Enter and edit marks in the grade sheet: Admin, and the teacher
  // who owns the assignment (the backend checks the owner).
  // AssistantPrincipal reads the sheet only (any write gets 403).
  readonly canEnterGrades = computed(
    () => this.isAdmin() || this.isTeacher()
  );


  // ===== Settings =====

  // Choose the attendance officer (Settings → Attendance officer): Admin only.
  readonly canManageAttendanceOfficer = computed(
    () => this.isAdmin()
  );

  // Roll students over into the current term (Settings → Student rollover):
  // Admin only (API Reference, section 13). Anyone else gets 403.
  readonly canManageRollover = computed(
    () => this.isAdmin()
  );

}