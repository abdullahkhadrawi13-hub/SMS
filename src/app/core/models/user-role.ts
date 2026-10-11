// The roles of the system.
// Same names and same numbers as the backend enum (UserRole),
// so the number that comes in the login response can be compared directly.
//
// Use it instead of writing the role as a number:
//   roles: [UserRole.Admin, UserRole.AssistantPrincipal]   instead of   roles: [0, 1]
export enum UserRole {
  Admin = 0,
  AssistantPrincipal = 1,
  Teacher = 2,
  Student = 3,
  Parent = 4
}


// Returns the translation key of a role (ROLES in ar.json / en.json).
// One place for the whole app, so the pages do not repeat it.
// Use it with the translate pipe:
//   {{ getRoleTranslationKey(user.role) | translate }}
export function getRoleTranslationKey(role: UserRole): string {

  switch (role) {
    case UserRole.Admin:
      return 'ROLES.ADMIN';
    case UserRole.AssistantPrincipal:
      return 'ROLES.ASSISTANT_PRINCIPAL';
    case UserRole.Teacher:
      return 'ROLES.TEACHER';
    case UserRole.Student:
      return 'ROLES.STUDENT';
    case UserRole.Parent:
      return 'ROLES.PARENT';
    default:
      return 'ROLES.UNKNOWN';
  }
}