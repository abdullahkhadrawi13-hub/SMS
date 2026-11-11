import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { TeachersService } from '../../../core/services/teachers';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { TeacherListDto } from '../../../core/models/teacher';
import {
  getArabicName,
  getEnglishName,
  getFullName,
  getInitials
} from '../../../shared/utils/person-name';
import { StateCard } from '../../../shared/components/state-card/state-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';


// Data passed when the details dialog is opened.
export interface TeacherDetailsDialogData {
  teacherId: number;
}


// The avatar colours: --avatar-1 ... --avatar-6 in tokens.css.
const AVATAR_TONES = 6;


// The teacher details dialog (navy & gold, 11 Nov 2026).
// Header: the avatar, the name in the language of the page, the account
// badge and the teacher number. Body: "Teacher details" and "Account",
// two label / value lists with a rule between them (no inner cards).
// Read-only: editing is from ⋮ in the teachers list.
//
// The layout is the shared dialog layout in styles.css (.fd, .fd-head,
// .fd-body, .fd-foot); only the label / value list is in teacher-details.css.
// Opened by teachers-page with panelClass 'form-dialog' (full screen on the phone).
@Component({
  selector: 'app-teacher-details',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    StateCard,
    StatusBadge,
  ],
  templateUrl: './teacher-details.html',
  styleUrl: './teacher-details.css',
  host: { class: 'fd' }
})
export class TeacherDetails {

  // Service used to communicate with the Teachers API.
  private readonly teachersService = inject(TeachersService);

  // Picks the Arabic or English message from an API response.
  private readonly apiMessageService = inject(ApiMessageService);

  private readonly language = inject(Language);

  // Used to stop pending requests when the dialog is closed.
  private readonly destroyRef = inject(DestroyRef);

  // Reference used to close the details dialog.
  private readonly dialogRef =
    inject(MatDialogRef<TeacherDetails>);

  // Id of the teacher to display.
  private readonly data =
    inject<TeacherDetailsDialogData>(MAT_DIALOG_DATA);


  // The teacher returned by the API.
  readonly teacher = signal<TeacherListDto | null>(null);

  // True while the teacher is being loaded.
  readonly isLoading = signal(false);

  // Error message (API message or translation key).
  readonly errorMessage = signal('');


  // What the dialog shows: the names in the language of the page.
  // Recomputed when the teacher or the language changes.
  readonly view = computed(() => {
    const teacher = this.teacher();

    if (!teacher) {
      return null;
    }

    const isArabic = this.language.currentDirection() === 'rtl';

    return {
      name: getFullName(teacher, isArabic),
      nameAr: getArabicName(teacher),
      nameEn: getEnglishName(teacher),
      initials: getInitials(teacher, isArabic),
      // The same colour as in the teachers list.
      avatarTone: (teacher.teacherId % AVATAR_TONES) + 1
    };
  });


  constructor() {
    this.loadTeacher();
  }


  // Loads the teacher (GET /api/teachers/{teacherId}).
  loadTeacher(): void {

    const teacherId = this.data.teacherId;

    if (!teacherId || teacherId <= 0) {
      this.errorMessage.set('TEACHERS.DETAILS.INVALID_ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.teachersService
      .getTeacher(teacherId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          if (!response.success || !response.data) {

            this.teacher.set(null);

            this.errorMessage.set(
              this.apiMessageService.getMessage(response) ||
              'TEACHERS.DETAILS.LOAD_FAILED'
            );

            this.isLoading.set(false);
            return;
          }

          this.teacher.set(response.data);
          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Failed to load teacher:', error);

          this.teacher.set(null);

          // A missing teacher returns 404 with a normal body ("Teacher not found.").
          this.errorMessage.set(
            error.status === 404
              ? this.apiMessageService.getErrorMessage(error)
              : 'TEACHERS.DETAILS.LOAD_FAILED'
          );

          this.isLoading.set(false);
        },
      });
  }


  // Closes the dialog.
  close(): void {
    this.dialogRef.close();
  }


  // Loads the teacher again after a failed request.
  retry(): void {
    this.loadTeacher();
  }
}
