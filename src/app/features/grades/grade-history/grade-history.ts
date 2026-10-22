import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { GradeHistory as GradeHistoryData } from '../../../core/models/student-grade';
import { ApiMessageService } from '../../../core/services/api-message';
import { Language } from '../../../core/services/language';
import { formatApiDateTime } from '../../../shared/utils/date-time';
import { formatNumber } from '../../subjects/subject';

import { GradeHistoryTarget } from '../grades';
import { GradeHistoryCache } from '../grade-history-cache';


// One line of the history, ready to show.
//   change: "Changed from 8 to 10"  (oldMark → newMark)
//   edit:   "Edited" with no marks  (a change made before the history was kept)
//   origin: "Entered 8"             (the first entry, always last)
interface HistoryEntry {
  kind: 'change' | 'edit' | 'origin';
  oldMark: string;
  newMark: string;
  who: string;
  when: string;
}


// The history of one mark: who entered it, and every change (newest first).
// GET /api/studentgrades/{studentGradeId}/history, loaded when it opens
// (through GradeHistoryCache, so the same mark is loaded only once).
//
// Shown in two places by the grade sheet:
//   - a small menu next to the cell (wide screens)
//   - a bottom sheet (narrow screens, see GradeHistorySheet)
// "closed" asks the place that shows it to close it.
@Component({
  selector: 'app-grade-history',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './grade-history.html',
  styleUrl: './grade-history.css',
})
export class GradeHistory implements OnInit {

  private readonly cache = inject(GradeHistoryCache);
  private readonly language = inject(Language);
  private readonly apiMessageService = inject(ApiMessageService);
  private readonly destroyRef = inject(DestroyRef);


  // ===== Inputs / outputs =====

  readonly target = input.required<GradeHistoryTarget>();

  readonly closed = output<void>();


  // ===== State =====

  readonly history = signal<GradeHistoryData | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  private readonly isArabic = computed(
    () => this.language.currentDirection() === 'rtl'
  );


  // The lines of the history, newest first, the first entry last.
  readonly entries = computed<HistoryEntry[]>(() => {

    const history = this.history();

    if (!history) {
      return [];
    }

    const isArabic = this.isArabic();
    const entries: HistoryEntry[] = [];

    for (const change of history.changes) {
      entries.push({
        kind: 'change',
        oldMark: formatNumber(change.oldMark),
        newMark: formatNumber(change.newMark),
        who: isArabic ? change.changedByNameAr : change.changedByNameEn,
        when: formatApiDateTime(change.changedAt, isArabic),
      });
    }

    // Changed before 2026-10-21: no change rows, only the last edit.
    if (history.changes.length === 0 && history.editedAt) {
      entries.push({
        kind: 'edit',
        oldMark: '',
        newMark: '',
        who: (isArabic ? history.editedByNameAr : history.editedByNameEn) ?? '',
        when: formatApiDateTime(history.editedAt, isArabic),
      });
    }

    // The first mark: the oldMark of the oldest change, or the mark now
    // when it was never changed. Unknown for an old edit with no rows.
    const oldest = history.changes[history.changes.length - 1];

    const firstMark = oldest
      ? oldest.oldMark
      : history.editedAt ? null : history.mark;

    entries.push({
      kind: 'origin',
      oldMark: '',
      newMark: formatNumber(firstMark),
      who: isArabic ? history.recordedByNameAr : history.recordedByNameEn,
      when: formatApiDateTime(history.recordedAt, isArabic),
    });

    return entries;
  });

  readonly changeCount = computed(
    () => this.history()?.changes.length ?? 0
  );

  readonly currentMark = computed(
    () => formatNumber(this.history()?.mark)
  );


  ngOnInit(): void {
    this.load();
  }

  load(): void {

    this.loading.set(true);
    this.errorMessage.set('');

    this.cache
      .get(this.target().studentGradeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {

          this.loading.set(false);

          if (!response.success || !response.data) {
            this.errorMessage.set(this.apiMessageService.getMessage(response));
            return;
          }

          this.history.set(response.data);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Failed to load the mark history:', error);
          this.loading.set(false);
          this.errorMessage.set(this.apiMessageService.getErrorMessage(error));
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
