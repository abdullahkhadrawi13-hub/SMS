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

  readonly isTeacher = computed(
    () => this.role() === UserRole.Teacher
  );


  // ===== Students (API Reference, section 4) =====

  // Add, edit, activate and deactivate students: Admin only.
  // AssistantPrincipal reads every student, a teacher reads their own students.
  readonly canManageStudents = computed(
    () => this.isAdmin()
  );


  // ===== Teachers (API Reference, section 5) =====

  // Add, edit, activate and deactivate teachers: Admin only.
  // AssistantPrincipal can only read.
  readonly canManageTeachers = computed(
    () => this.isAdmin()
  );


  // ===== Subjects (API Reference, section 6) =====

  // Add, edit, activate and deactivate subjects: Admin only.
  // AssistantPrincipal can only read.
  readonly canManageSubjects = computed(
    () => this.isAdmin()
  );

  // A teacher cannot read the subjects list or the assignments list (403).
  // The Subjects page shows them "My subjects" instead
  // (GET /api/teacherassignments/mine, API Reference section 8).
  readonly seesOwnSubjectsOnly = computed(
    () => this.isTeacher()
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

}
