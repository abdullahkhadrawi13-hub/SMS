import { Component, computed, input, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherListDto } from '../../../../core/services/teachers';

import { getTeacherName } from '../teacher-name';


@Component({
  selector: 'app-officer-teacher-list',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './officer-teacher-list.html',
  styleUrl: './officer-teacher-list.css',
})
export class OfficerTeacherList {

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // Active teachers matching the search (current page).
  readonly teachers = input<TeacherListDto[]>([]);

  // Loading and error state of the list.
  readonly isLoading = input(false);
  readonly errorMessage = input('');

  // Pagination state (pageNumber is 1-based).
  readonly totalCount = input(0);
  readonly pageNumber = input(1);
  readonly pageSize = input(10);

  // False until the Admin searches: the list is empty
  // and a hint asks him to search for a teacher.
  readonly hasSearched = input(false);

  // ID of the current officer: his row is marked and cannot be selected.
  readonly officerId = input<number | null>(null);

  // ID of the teacher selected by the Admin (not saved yet).
  readonly selectedId = input<number | null>(null);

  // True while the parent page is saving: the rows cannot be clicked.
  readonly disabled = input(false);

  // ===== Loading modes =====

  // First load: there is nothing on the screen yet,
  // so the big spinner replaces the content.
  readonly isInitialLoading = computed(() =>
    this.isLoading() && this.teachers().length === 0
  );

  // Reload: the old data stays on the screen with a thin progress bar
  // on top, so the content does not disappear and jump.
  readonly isRefreshing = computed(() =>
    this.isLoading() && !(this.teachers().length === 0)
  );


  // ===== Outputs (the parent page loads, keeps the selection and saves) =====

  readonly pageChange = output<PageEvent>();
  readonly retry = output<void>();
  readonly selectTeacher = output<TeacherListDto>();


  // Runs when a row is clicked.
  onSelect(teacher: TeacherListDto): void {

    // The current officer is already assigned: nothing to select.
    if (this.disabled() || teacher.teacherId === this.officerId()) {
      return;
    }

    this.selectTeacher.emit(teacher);
  }


  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherListDto): string {
    return getTeacherName(teacher);
  }
}